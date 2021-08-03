from collections import OrderedDict
from pprint import pprint
from contextlib import contextmanager
import os
import pickle
from flask import Flask, request, abort, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
import dotenv
import redis

# Grab the .env values to use globably in this module if they are not already in the environment.
dotenv.load_dotenv()
REDIS_PASS = os.environ['PASS']
REDIS_HOST = os.environ['HOST']
REDIS_PORT = os.environ['PORT']
DEBUG = os.environ.get('DEBUG')

POOL = 30
FIELDS = ("attack", "defense", "hps", "speed")

app = Flask(__name__)
CORS(app, headers='Content-Type')


@app.route('/match', methods=['POST', 'OPTIONS'])
def match():
    # Post your own stat to the queue if you haven't yet done so.
    # Grab the oldest post that is not your own and remove it.
    stats = request.json
    if not stats:
        abort(422, description='json required')
    stats = verify_and_intify(stats)
    if stats is None:
        abort(422, description='invalid stats')

    store = Store()

    with store.get_queue() as queue:
        if queue is None:
            return jsonify({'success': False})

        if queue.is_new(stats):
            queue.push(stats)
        if DEBUG:
            queue.print()
        opponent = queue.pop_opponent(stats['name'])
        store.store_queue(queue)
    if not opponent:
        return jsonify({'success': False})
    return jsonify({'success': True, 'villain': opponent})


def verify_and_intify(stats, fields=FIELDS):

    if not "name" in stats and not "id" in stats:
        return None
    if not all(f in stats for f in fields):
        return None
    if not all(stats[f].isdigit() for f in fields):
        return None

    # the intify part
    for f in fields:
        stats[f] = int(stats[f])

    if not sum(stats[f] for f in fields) == POOL:
        return None
    if not all(stats[f] >= 0 for f in fields):
        return None
    if stats['attack'] < 1 or stats['hps'] < 1:
        return None

    return stats


@app.errorhandler(HTTPException)
def error_handler(error):
    return jsonify({
        'success': False,
        'description': error.description,
        'name': error.name,
        'status_code': error.code
        }), error.code


class Store:
    def __init__(self):
        self.redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS)

    @contextmanager
    def get_queue(self):
        acquired = False
        try:
            lock = self.redis.lock('key', blocking_timeout=1)
            acquired = lock.acquire()
            if not acquired:
                queue = None
            else:
                # Create a new queue if it's not in the redis database
                pickled = self.redis.get('queue') or pickle.dumps(Queue())
                queue = pickle.loads(pickled)
            yield queue
        finally:
            if acquired:
                lock.release()

    def store_queue(self, queue):
        self.redis.set('queue', pickle.dumps(queue))


class Queue:
    MAX_USED = 100
    MAX_QUEUE = 100
    def __init__(self):
        self.data = OrderedDict()
        self._used = set()

    def is_new(self, entry):
        return entry['id'] not in self._used

    def push(self, entry):
        # The method I'm using probablly doesn't scale well so
        # let's not let this object get too big.
        if len(self.data) > self.MAX_QUEUE:
            self.data.popitem(False) # removes the oldest item
        if len(self._used) > self.MAX_USED:
            self._used = set()

        self.data[entry['id']] = entry
        self._used.add(entry['id'])

    def pop_opponent(self, name):
        """
        Remove and return the oldest post with a different name.
        """
        for key, entry in self.data.items():
            if entry['name'] != name:
                return self.data.pop(key)
        return None

    def print(self):
        print('data:')
        pprint(self.data)
        print('used:')
        pprint(self._used)

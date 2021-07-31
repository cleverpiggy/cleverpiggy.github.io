from collections import OrderedDict
from pprint import pprint
from contextlib import contextmanager
import pickle
from flask import Flask, request, abort, jsonify
from werkzeug.exceptions import HTTPException
from dotenv import dotenv_values
import redis


#TODO: _used part of queue isnt having desired effect

# grab the .env values to use globably in this module
_vals = dotenv_values()
REDIS_PASS = _vals['PASS']
REDIS_ENDPOINT = _vals['ENDPOINT']
REDIS_PORT = _vals['PORT']

POOL = 25

app = Flask(__name__)

@app.route('/match', methods=['GET', 'POST'])
def match():
    # Post your own stat to the queue if you haven't yet done so.
    # Grab the oldest post that is not your own and remove it.
    stats = request.json
    if not stats:
        abort(422, description='json required')
    if not verify(stats):
        abort(422, description='invalid stats')

    store = Store()

    with store.get_queue() as queue:
        if queue is None:
            return jsonify({'success': False})

        if queue.is_new(stats):
            queue.push(stats)
        queue.print()
        opponent = queue.pop_opponent(stats['name'])
        store.store_queue(queue)
    if not opponent:
        return jsonify({'success': False})
    return jsonify({'success': True, 'villian': opponent})


def verify(stats, fields=("attack", "defense", "hps", "speed")):

    if not all(f in stats for f in fields):
        return False
    if not "name" in stats and "id" in stats:
        return False
    try:
        assert sum(int(stats[f]) for f in fields) == POOL
    except (ValueError, AssertionError):
        return False
    for f in fields:
        if int(stats[f]) < 0:
            return False
    if stats['attack'] < 1 or stats['hps'] < 1:
        return False
    return True


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
        self.redis = redis.Redis(host=REDIS_ENDPOINT, port=REDIS_PORT, password=REDIS_PASS)

    @contextmanager
    def get_queue(self):
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
    def __init__(self):
        self.data = OrderedDict()
        self._used = set()

    def is_new(self, entry):
        return entry['id'] not in self._used

    def push(self, entry):
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

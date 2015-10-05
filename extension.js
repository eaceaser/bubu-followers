'use strict';

const POLL_INTERVAL = 30*1000;

function Followers(nodecg) {
  this.nodecg = nodecg;
  this.twitch = nodecg.extensions['lfg-twitchapi'];
  this.latestFollower = nodecg.Replicant("latestFollower", { defaultValue: null, persistent: true });

  this._scheduleFollowers();
}

Followers.prototype._scheduleFollowers = function() {
  this.nodecg.log.debug("Polling for TwitchTV Followers.");
  this.twitch.get('/channels/{{username}}/follows', { limit: 50, direction: 'desc' }, (err, code, body) => {
    if (err) {
      this.nodecg.log.error(err);
      setTimeout(() => { this._scheduleFollowers() }, POLL_INTERVAL);
      return;
    }

    if (code != 200) {
      this.nodecg.log.error("Unknown response code: "+code);
      setTimeout(() => { this._scheduleFollowers() }, POLL_INTERVAL);
      return;
    }

    var lastFollowerTs = 0;
    if (this.latestFollower.value) {
      lastFollowerTs = Date.parse(this.latestFollower.value.created_at);
    }

    if (body.follows.length > 0) {
      this.nodecg.log.debug("Discovered " + body.follows.length + " followers.");
      this.latestFollower.value = body.follows[0];

      for (var follower of body.follows.reverse()) {
        var parsedTs = Date.parse(follower.created_at);
        if (parsedTs > lastFollowerTs) {
          this.nodecg.sendMessage('follower', follower);
        }
      }
    }

    setTimeout(() => { this._scheduleFollowers() }, POLL_INTERVAL);
  });
};

module.exports = function(api) {
  return new Followers(api);
};

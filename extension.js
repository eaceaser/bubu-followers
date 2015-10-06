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
  this.twitch.get('/channels/{{username}}/follows', { limit: 50, direction: 'desc' },
    function (err, code, body) {
      if (err) {
        this.nodecg.log.error(err);
        setTimeout(function() { this._scheduleFollowers() }.bind(this), POLL_INTERVAL);
        return;
      }

      if (code != 200) {
        this.nodecg.log.error("Unknown response code: "+code);
        setTimeout(function() { this._scheduleFollowers() }.bind(this), POLL_INTERVAL);
        return;
      }

      var lastFollowerTs = 0;
      if (this.latestFollower.value) {
        lastFollowerTs = Date.parse(this.latestFollower.value.created_at);
      }

      if (body.follows.length > 0) {
        this.nodecg.log.debug("Discovered " + body.follows.length + " followers.");
        this.latestFollower.value = body.follows[0];

        body.follows.reverse().map(function(follower) {
          var parsedTs = Date.parse(follower.created_at);
          if (parsedTs > lastFollowerTs) {
            this.nodecg.sendMessage('follower', follower);
          }
        }.bind(this));
      }

      setTimeout(function() { this._scheduleFollowers() }.bind(this), POLL_INTERVAL);
    }.bind(this)
  );
};

module.exports = function(api) {
  return new Followers(api);
};

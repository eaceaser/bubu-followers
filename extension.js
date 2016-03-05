'use strict';

function Followers(nodecg) {
  this.nodecg = nodecg;
  this.request = require('request');
  this.latestFollower = nodecg.Replicant('latestFollower', { defaultValue: null, persistent: true });
  this.username = nodecg.bundleConfig.username;
  this.pollInterval = nodecg.bundleConfig.pollInterval * 1000;

  this._scheduleFollowers();
}

Followers.prototype._scheduleFollowers = function() {
  this.nodecg.log.debug('Polling for TwitchTV Followers.');
  this.request('https://api.twitch.tv/kraken/channels/' + this.username + '/follows?limit=50',
    (err, response, body) => {
      if (err) {
        this.nodecg.log.error(err);
        setTimeout(() => { this._scheduleFollowers(); }, this.pollInterval);
        return;
      }
      if (response.statusCode != 200) {
        this.nodecg.log.error('Unknown response code: ' + response.statusCode);
        setTimeout(() => { this._scheduleFollowers(); }, this.pollInterval);
        return;
      }

      var lastFollowerTs = 0;
      if (this.latestFollower.value) {
        lastFollowerTs = Date.parse(this.latestFollower.value.created_at);
      }

      try {
        body = JSON.parse(body);
      } catch (error) {
        this.nodecg.log.error(error);
        return;
      }

      if (body.follows.length > 0) {
        this.nodecg.log.debug('Discovered ' + body.follows.length + ' followers.');
        this.latestFollower.value = body.follows[0];

        body.follows.reverse().map((follower) => {
          var parsedTs = Date.parse(follower.created_at);
          if (parsedTs > lastFollowerTs) {
            this.nodecg.sendMessage('follower', follower);
          }
        });
      }

      setTimeout(() => { this._scheduleFollowers(); }, this.pollInterval);
    }
  );
};

module.exports = function(api) {
  return new Followers(api);
};

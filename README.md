# FriendLine

##Overview

This is a sample project that I put together to learn more about OAuth, Node.js and Twitter's API.

For the time being, it's up and running at: [http://friendline.azurewebsites.net](http://friendline.azurewebsites.net).  I reserve the right to take it down without notice if it starts costing me any significant money for hosting.

This is a basic friend/follower info browser.  I wrote from the ground up (not using express or connect) so that I'd have to understand more of the low-level interactions between node and the clients.  Session management is a simple cookie(rid initially, then twauth).  In the current design, the accessTokenSecret is held in-memory on the server, so client logins will expire if the server process is recycled.

##Dependencies
   * [cookies](https://www.npmjs.org/package/cookies): ~0.4.0
   * [node-twitter-api](https://www.npmjs.org/package/node-twitter-api): ~1.1.3
   * [nconf](https://www.npmjs.org/package/nconf): ~0.6.9

##How do I get this working?

First, you'll need to create an App over at [dev.twitter.com](https://dev.twitter.com/).  Once you have an App consumerKey and consumerSecret, copy settings_sample.json to settings.json and enter the key and secret in the appropriate locations.

You'll also need to edit 'app:callbackUri' in the settings file to reflect where you're going to run.  If you're running local, just use 'http://localhost:1337/twauth'.

Launch locally by running `node server.js` then open your browser to [http://localhost:1337/](http://localhost:1337/)

###License

Apache License Version 2.0 Included as LICENSE.TXT



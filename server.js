var http = require('http');
var port = process.env.port || 1337; // Test Port vs Prod
var Cookies = require( "cookies" )

var nconf = require('nconf');
nconf.env().file({ file: 'settings.json' });
var util = require('util');
var fs = require("fs");
var querystring = require('querystring');

var globalRequestToken = {};
var globalRequestTokenSecret = {};
var oauthPrivateKey = {}; 

// Monkey-patch http://stackoverflow.com/questions/646628/how-to-check-if-a-string-startswith-another-string
String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
}

var twitterAPI = require('node-twitter-api');

var twitter = new twitterAPI({
    consumerKey: nconf.get('twitter:consumerKey'),
    consumerSecret: nconf.get('twitter:consumerSecret'),
    callback: nconf.get('app:callbackUri')
});

http.createServer(function (req, res) {
    var cookies=new Cookies(req,res);

    // Very Rough if/else if provides routing
    if(req.url.startsWith('/logout'))
    {
        cookies.set('twauth'); // Clear the cookie
        WriteHtml(res,Logout()); // Render Logout
    } 
    else if(req.url.startsWith('/twauth'))
    {
        TwitterAccTok(req,res); // Process Callback from Twitter OAuth
    }
    else if(req.url.startsWith('/list') && cookies.get('twauth')) // We're logged in and trying to list
    {
           var token=JSON.parse(cookies.get('twauth'));
           
           if(!oauthPrivateKey[token.oauth_token]) {
               cookies.set('twauth'); // Clear the cookie
               WriteHtml(res,ErrorBody('Server-side Cache Does Not Have Related Auth Key, Please Login Again.'));
           } else {
               token.oauth_privatekey = oauthPrivateKey[token.oauth_token];
               var route = req.url.split('/');
           
               var user=token.tw_user;
               if(route.length===3){ user = route[2]; } // check if a screen_name is included in the uri path
               //get friends
               twitter.friends('list',{screen_name:user,skip_status:true,include_user_entities:true,count:200},token.oauth_token,token.oauth_privatekey,function(err,data_friend,response){
               
                   //getfollowers    
                   twitter.followers('list',{screen_name:user,skip_status:true,include_user_entities:true,count:200},token.oauth_token,token.oauth_privatekey,function(err,data_follower,response){
                            WriteHtml(res,ListBody(data_friend,data_follower)); // Render
                       }.bind(res).bind(data_friend));
               }.bind(res).bind(token).bind(user));
           }
    } else if(req.url.startsWith('/login')) {
           TwitterReqTok(req,res); //get request token, chains to call Twitter OAuth
    } else if(req.url==='/') {
        if(cookies.get('twauth'))
        {
            WriteHtml(res,LoggedIn()); // Render Logged In Home
        }
        else
        {
            WriteHtml(res,Body()); // Render Anonymous Home
        }
    } else if(req.url==='/favicon.ico') { // Deal with browsers asking for a favicon
        ServeFile(res,'favicon.png','image/png');
    } else {
        console.log('Redirecting from '+req.url+' to /'); // Bounce everything else back to /
        Redirect(res,'/');
    }
}).listen(port);

/*
 * Poor Man's Views:
 */

function Body()
{
    return("<html><body><h1>FriendLineSample</h1><hr/><a href=\"/login\">Log In</a></body></html>")    
}

function LoggedIn()
{
    return("<html><body><h1>FriendLineSample</h1><hr/><a href=\"/list\">See List</a><br/><a href=\"/logout\">Log Out</a></body></html>")    
}

function ErrorBody(message)
{
    return("<html><body><h1>FriendLineSample</h1><h2>"+message+"</h2><a href=\"/\">Return Home</a></body></html>")    
}


function Logout()
{
    return("<html><body><h1>FriendLineSample</h1><h2>Logging Out...</h2><a href=\"/\">Return Home</a></body></html>")    
}

function ListBody(data_friend,data_follower)
{
    var friends=data_friend.users.sort(function(a,b){
        if (Date.parse(a.created_at) > Date.parse(b.created_at))
        { return -1; }
        return 1; });
    var followers=data_follower.users.sort(function(a,b){
        if (Date.parse(a.created_at) > Date.parse(b.created_at))
        { return -1; }
        return 1; });;
    var body = "<html><body><h1>FriendLineSample</h1><hr/>";
    body+="<h3>Following["+friends.length+"]:</h3>";
    body+="<table border=1><tr><th>User</th><th>On Twitter Since</th><th>Followers</th><th>Following</th></tr>";
    for(var i in friends)
    {
        var user=friends[i];
        body+="<td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"\">" + user.screen_name + "</a> (<a href=\"/list/"+user.screen_name+"\">friendline</a>)</td><td>" + user.created_at +"</td><td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"/followers/\">"+ user.followers_count + "</a></td><td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"/following/\">"+ user.friends_count+ "</a></td></tr>";
    }
    body+="</table>";
    body += "<hr/>";
    body+="<h3>Followed By["+followers.length+"]:</h3>";
    body+="<table border=1><tr><th>User</th><th>On Twitter Since</th><th>Followers</th><th>Following</th></tr>";
    for(var i in followers)
    {
        var user=followers[i];
        body+="<td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"\">" + user.screen_name + "</a> (<a href=\"/list/"+user.screen_name+"\">friendline</a>)</td><td>" + user.created_at +"</td><td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"/followers/\">"+ user.followers_count + "</a></td><td><a target=\"_blank\" href=\"https://twitter.com/"+user.screen_name+"/following/\">"+ user.friends_count+ "</a></td></tr>";
    }
    body+="</table>";
    body += "<hr/>";
    body += "<a href=\"/\">Return Home</a>"
    body += "<br/>";
    body += "<a href=\"/logout\">Log Out</a>";
    body +="</body></html>";
    return(body);    
}


/*
 * HTTP Utility Functions:
 */

function WriteHtml(res,body)
{
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(body);
}

function Redirect(res,url)
{
   res.writeHead(302, { 'Location': url });
   res.end();
}

function ServeFile(res,filename,contentType)
{
    contentType = contentType || "binary";
      fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.write(err + "\n");
        res.end();
        return;
      }
      res.writeHead(200, {"Content-Type": contentType });
      res.write(file, 'binary');
      res.end();  
      });
}

/*
 * Twitter OAuth Handling
 */

function TwitterReqTok(req,res)
{
    var cookies=new Cookies(req,res);
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
    if (error) {
            WriteHtml(res,ErrorBody('An unexpected Error Occured Getting the Twitter Request Token.<br/>' + error.toString()));
    } else {
        // Got requestToken, redirecting user to Twitter OAuth endpoint.
        var rid = Math.floor(Math.random()*2e14).toString(); // rough uuid
        cookies.set('rid',rid,{overwrite:true,maxage:60000*15}); //set rid to expire in 15 minutes
        globalRequestToken[rid] = requestToken; // save these, we need them to process the callback 
        globalRequestTokenSecret[rid] = requestTokenSecret; // Note, we never clear this out, so they will grow until the process recycles
        Redirect(res,'https://twitter.com/oauth/authenticate?oauth_token='+requestToken);
    }
    }.bind(res));
}

function TwitterAccTok(req,res)
{
    var cookies=new Cookies(req,res);
    qs = querystring.parse(req.url.split('?')[1]);
    var rid=cookies.get('rid'); // Get the id we saved as a cookie to match user with RequestToken
    if(!rid || !globalRequestToken[rid] || !globalRequestTokenSecret[rid]) {
        WriteHtml(res,ErrorBody('An unexpected Error Occured Handling the Twitter OAuth Callback.  RID Cookie or Server-Side RequestToken Cache not found.'));
    } else {

        twitter.getAccessToken(globalRequestToken[rid], globalRequestTokenSecret[rid], qs.oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
        if (error) {
            WriteHtml(res,ErrorBody('An unexpected Error Occured Getting the Twitter Access Token.<br/>' + error));
        } else {
            //store accessToken and accessTokenSecret in cookies so they follow the user
            oauthPrivateKey[accessToken]=accessTokenSecret;
            cookies.set('twauth',JSON.stringify({oauth_token:accessToken,tw_user:results.screen_name}),{overwrite:true,maxage:86400000*14}); //set twauth to expire in 14 days
            Redirect(res,'/list');
        }
        });
        delete globalRequestToken[rid];
        delete globalRequestTokenSecret[rid];
    }
}
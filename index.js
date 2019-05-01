var Twit = require('twit');
var request = require('request');
var config = require('./config');

var T = new Twit(config);

twitIt();
setInterval(twitIt, 1000 * 60 * 30);

function twitIt() {
  request.get('https://got-quotes.herokuapp.com/quotes', response);

  function response(err, res, body) {
    if (err) {
      console.log('Error getting quote: ', err);
    } else if (res.statusCode !== 200) {
      console.log('Error proccessing request: ', res);
    } else {
      var quote = JSON.parse(body).quote;
      var char = JSON.parse(body).character.replace(/\s/g, '');
      var twit = {
        status: quote + ' #gameofthrones'
      };
      console.log(char);
      T.post('statuses/update', twit, twitted);
    }
  }

  function twitted(err, data, response) {
    if (err) {
      console.log('Something went wrong:', err);
    } else {
      console.log(data.text);
    }
  }
}

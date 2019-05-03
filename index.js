const Twit = require("twit");
const request = require("request");
const config = require("./config");

const T = new Twit(config);

main();

function getContent () {
    const options = {
        url: "https://got-quotes.herokuapp.com/quotes",
    };

    return new Promise(function (resolve, reject) {
        request.get(options, function (err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body));
            }
        });
    });
}

function postTwit (status) {
    const twit = {
        status: status,
    };

    return new Promise(function (resolve, reject) {
        T.post("statuses/update", twit, function (err, data, response) {
            if (err) {
                reject(err);
            } else {
                resolve(data.text);
            }
        });
    });
}

function main () {
    const contentPromise = getContent(postTwit);
    contentPromise.then(function (content) {
        const quote = content.quote;
        const character = content.character.replace(/\s/g, "");

        const twitted = postTwit(quote + " #gameofthrones" + " #" + character);
        twitted.then(function (status) {
            console.log(status);
        }, function (err) {
            console.log("Something went wrong posting the twit: ", err);
        });
    }, function (err) {
        console.log("Error getting content: ", err);
    });
}

const Twit = require("twit");
var rp = require("request-promise").defaults({ encoding: null, });
const config = require("./config");

const fs = require("fs").promises;
const path = require("path");

const T = new Twit(config);

main();

function getContent () {
    const options = {
        url: "https://www.reddit.com/r/freefolk/hot.json",
    };

    return rp(options).then((body) => {
        return parseSubReddit(JSON.parse(body));
    }).catch(function (err) {
        console.log("Error getting content: ");
        return err;
    });
}

function saveImage (url, path) {
    const options = {
        url: url,
    };

    return rp(options).then(function (body) {
        return fs.writeFile(path, body)
            .catch(function (err) {
                return err;
            });
    });
}

function randomIndex (upperLimit) {
    return Math.floor(Math.random() * (upperLimit - 1));
}

function parseSubReddit (response) {
    let posts = response.data.children;
    for (let i = randomIndex(posts.length), post = posts[i]; !posts[i].data.is_self;) {
        let data = {
            title: post.data.title,
            url: post.data.url,
        };
        return data;
    }
}

function postTwit (content) {
    return new Promise(function (resolve, reject) {
        const localname = "downloaded_image";
        const PATH = path.join(__dirname, localname);

        return saveImage(content.url, PATH).then(function () {
            T.postMediaChunked({ file_path: PATH, }, function (err, data, response) {
                if (err) {
                    console.log("upload error");
                    reject(err);
                } else {
                    var mediaIdStr = data.media_id_string;
                    var metaParams = { media_id: mediaIdStr, alt_text: { text: content.title, }, };

                    return T.post("media/metadata/create", metaParams)
                        .then(function () {
                            // now we can reference the media and post a tweet (media will attach to the tweet)
                            var params = { status: content.title + " #gameofthrones",
                                media_ids: [ mediaIdStr, ], };

                            return T.post("statuses/update", params);
                        }).then(function (result) {
                            fs.unlink(PATH).catch(function (err) {
                                reject(err);
                            });

                            resolve(result.data.text);
                        }).catch(function (err) {
                            console.log("error in status update");
                            reject(err);
                        });
                }
            });
        }).catch(function (err) {
            reject(err);
        });
    });
}

function main () {
    getContent().then(function (content) {
        return postTwit(content);
    }).then(function (status) {
        console.log(status);
    }).catch(function (err) {
        console.log(err);
    });
}

const Twit = require("twit");
const request = require("request").defaults({ encoding: null, });
const config = require("./config");

const fs = require("fs");
const path = require("path");

const T = new Twit(config);

main();

function getContent () {
    const options = {
        url: "https://www.reddit.com/r/freefolk/hot.json",
    };

    return new Promise(function (resolve, reject) {
        request.get(options, function (err, resp, body) {
            if (err) {
                console.log("Error getting content: ");
                reject(err);
            } else {
                resolve(parseSubReddit(JSON.parse(body)));
            }
        });
    });
}

function saveImage (url, path) {
    const options = {
        url: url,
    };
    return new Promise(function (resolve, reject) {
        request.get(options, function (err, resp, body) {
            if (err) {
                reject(err);
            } else {
                fs.writeFile(path, body, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
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
                            fs.unlinkSync(PATH);
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
    const contentPromise = getContent(postTwit);
    contentPromise.then(function (content) {
        // parse content to twit
        return postTwit(content);
    }).then(function (status) {
        console.log(status);
    }).catch(function (err) {
        console.log(err);
    });
}

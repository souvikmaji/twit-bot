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

function parseSubReddit (response) {
    let posts = response.data.children;
    for (let post of posts.reverse()) {
        if (!post.data.is_self) {
            let data = {
                title: post.data.title,
                url: post.data.url,
            };
            return data;
        }
    }
}

function postTwit (content) {
    return new Promise(function (resolve, reject) {
        const localname = "downloaded_image";
        const PATH = path.join(__dirname, localname);
        let imagePromise = saveImage(content.url, PATH);
        imagePromise.then(function () {
            T.postMediaChunked({ file_path: PATH, }, function (err, data, response) {
                if (err) {
                    console.log("upload error");
                    reject(err);
                } else {
                    var mediaIdStr = data.media_id_string;
                    var altText = content.title;
                    var metaParams = { media_id: mediaIdStr, alt_text: { text: altText, }, };

                    T.post("media/metadata/create", metaParams, function (err, data, response) {
                        if (!err) {
                        // now we can reference the media and post a tweet (media will attach to the tweet)
                            var params = { status: content.title + " #gameofthrones",
                                media_ids: [ mediaIdStr, ], };

                            T.post("statuses/update", params, function (err, data, response) {
                                if (err) {
                                    reject(err);
                                } else {
                                    fs.unlinkSync(PATH);
                                    resolve(data.text);
                                }
                            });
                        } else {
                            reject(err);
                        }
                    });
                }
            });
        }, function (err) {
            reject(err);
        });
    });
}

function main () {
    const contentPromise = getContent(postTwit);
    contentPromise.then(function (content) {
        // parse content to twit
        const twitted = postTwit(content);
        twitted.then(function (status) {
            console.log(status);
        }, function (err) {
            console.log("Something went wrong posting the twit: ", err);
        });
    }, function (err) {
        console.log("Error getting content: ", err);
    });
}

const Twit = require("twit");
const request = require("request-promise").defaults({ encoding: null, });
const config = require("./config");

const fs = require("fs").promises;
const path = require("path");

const T = new Twit(config);

main();

async function getContent () {
    const options = {
        url: "https://www.reddit.com/r/freefolk/hot.json",
    };

    try {
        let body = await request(options);
        return parseSubReddit(JSON.parse(body));
    } catch (err) {
        console.log("Error getting content: ");
        throw err;
    }
}

async function saveImage (url, path) {
    const options = {
        url: url,
    };

    try {
        let body = await request(options);
        await fs.writeFile(path, body);
    } catch (err) {
        console.log("error saving media in local storage");
        throw err;
    }
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
    return new Promise((resolve, reject) => {
        const localname = "downloaded_image";
        const PATH = path.join(__dirname, localname);

        return saveImage(content.url, PATH).then(() => {
            T.postMediaChunked({ file_path: PATH, }, (err, data, response) => {
                if (err) {
                    console.log("upload error");
                    reject(err);
                } else {
                    const mediaIdStr = data.media_id_string;
                    const metaParams = { media_id: mediaIdStr, alt_text: { text: content.title, }, };

                    return T.post("media/metadata/create", metaParams).then(() => {
                        // now we can reference the media and post a tweet (media will attach to the tweet)
                        const params = { status: content.title + " #gameofthrones",
                            media_ids: [ mediaIdStr, ], };

                        return T.post("statuses/update", params);
                    }).then((result) => {
                        fs.unlink(PATH).catch((err) => {
                            console.log("error removing media from local storage");
                            reject(err);
                        });

                        resolve(result.data.text);
                    }).catch((err) => {
                        console.log("error in status update");
                        reject(err);
                    });
                }
            });
        }).catch((err) => {
            reject(err);
        });
    });
}

function main () {
    getContent().then((content) => {
        return postTwit(content);
    }).then((status) => {
        console.log(status);
    }).catch((err) => {
        console.log(err);
    });
}

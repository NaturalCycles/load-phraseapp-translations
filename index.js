/*
  Load in PhraseApp translations with v2 API.
  Must specify an API token, a locale, and a format.
  Default format returned is js for i18n-node-2.
*/

const ETagRequest = require('request-etag');
const fs = require('fs');
const _ = require('lodash');
const async = require('async');

const request = new ETagRequest({
    max: 10 * 1024 * 1024
});

const path = 'https://api.phraseapp.com/v2';

module.exports = class PhraseappLoader {
    constructor(options) {
        if (!options.access_token || !options.project_id) {
            throw new Error('Must supply a value for access_token and project_id');
        }

        this.options = {
            file_format: "node_json",
            file_extension: "js",
            location: process.cwd(),
            transform: function (translations) {
                return translations;
            }
        };

        this.configure(options)
    }

    configure(options) {
        return _.extend(this.options, options);
    }

    download(callback) {
        const self = this;

        this.fetchLocales(function (err, locales) {
                console.log("Got locales", locales);
                if (!err) {
                    async.eachLimit(locales, 2, function (l, callback) {
                        self.downloadTranslationFile(l, function (err, res) {
                            if (!err) {
                                console.log("Translation for " + l + " downloaded successfully.");
                                return callback(null);
                            } else {
                                console.error("Error downloading " + l + ".", err);
                                return callback(err);
                            }
                        });
                    }, callback);
                }
            }
        );
    }

    fetchLocales(callback) {
        const options = this.options;

        request(path + '/projects/' + options.project_id + '/locales?access_token=' + options.access_token, function (err, res, body) {
            if (!err && res.statusCode === 200) {
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body)
                    } catch (e) {
                        console.log(e)
                    }
                }

                const locales = _.map(body, "code");
                return callback(null, locales);
            } else if (err) {
                console.error("An error occurred when fetching locales", err);
                return callback(err);
            }
        });
    }

    downloadTranslationFile(locale, callback) {
        const options = this.options;
        const translationPath = path + '/projects/' + options.project_id + '/locales/' + locale + '/download?access_token=' + options.access_token + '&file_format=' + options.file_format;

        request(translationPath, function (err, res, body) {
            if (!err && res.statusCode >= 200 && res.statusCode < 300) {
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body)
                    } catch (e) {
                        console.log(e);
                        console.log(body);
                    }
                }

                const transformed = options.transform(body);
                const fileName = options.location + "/" + locale + "." + options.file_extension;

                fs.writeFile(fileName, JSON.stringify(transformed, undefined, 2), function (err) {
                    if (err) {
                        return console.error("An error occured when downloading translation file", err);
                    }

                    return callback(null, fileName);
                })
            } else {
                if (err) {
                    console.error("An error occured when downloading translation file", err);
                    return callback(err);
                }
                console.error("Got status code " + res.statusCode);
                return callback(true);
            }
        });
    }
};

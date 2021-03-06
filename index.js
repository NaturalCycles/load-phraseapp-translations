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

class PhraseappLoader {
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

        this.fetchLocaleCodes(function (err, locales) {
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

    fetchProjects(callback) {
        const options = this.options;

        request(path + '/projects?access_token=' + options.access_token, function (err, res, body) {
            if (!err && res.statusCode < 400) {
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body)
                    } catch (e) {
                        console.log(e)
                    }
                }

                return callback(null, body);
            } else if (err) {
                console.error("An error occurred when fetching projects", err);
                return callback(err);
            }
        });
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

                return callback(null, body);
            } else if (err) {
                console.error("An error occurred when fetching locales", err);
                return callback(err);
            }
        });
    }

    fetchLocaleCodes(callback) {
        this.fetchLocales((err, body) => {
            if (err) {
                callback(err)
            } else {
                const localeCodes = _.map(body, "code");
                callback(null, localeCodes)
            }
        })
    }

    fetchTranslationFile(locale, callback) {
        const options = this.options;
        const translationPath = path + '/projects/' + options.project_id + '/locales/' + locale + '/download?access_token=' + options.access_token + '&file_format=' + options.file_format;

        console.log('Fetching ' + translationPath)
        request(translationPath, function (err, res, body) {
            if (!err && res.statusCode >= 200 && res.statusCode < 400) {
                if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body)
                    } catch (e) {
                        console.log(e);
                        console.log(body);
                    }
                }

                const transformed = options.transform(body);

                callback(null, transformed);
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

    downloadTranslationFile(locale, callback) {
        const options = this.options;

        this.fetchTranslationFile(locale, function (err, transformed) {
            if (err) {
                return callback(err);
            }

            const fileName = options.location + "/" + locale + "." + options.file_extension;

            fs.writeFile(fileName, JSON.stringify(transformed, undefined, 2), function (err) {
                if (err) {
                    return console.error("An error occured when downloading translation file", err);
                }

                return callback(null, fileName);
            });
        });
    }
};

module.exports = PhraseappLoader;
module.exports.PhraseappLoader = PhraseappLoader;

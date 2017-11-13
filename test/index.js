var should = require("chai").should(),
    fs = require("fs"),
    nock = require("nock"),
    ETagRequest = require("request-etag"),
    _ = require('lodash'),
    PhraseappLoader = require("../index");

var http = require("http");
var request = new ETagRequest({
    max: 10 * 1024 * 1024
});

describe("#configure", function () {
    let config;

    before(function () {
        const loader = new PhraseappLoader({
            access_token: 1,
            project_id: 1,
            location: 'test'
        });

        config = loader.options;
    });

    it("is an object", function () {
        config.should.be.an("object");
    });

    it("has the required keys", function () {
        config.should.have.all.keys(
            "access_token",
            "project_id",
            "file_format",
            "file_extension",
            "location",
            "transform"
        );
    });

    it("overrides file location", function () {
        config.should.have.property('location', 'test');
    })

    it("default transform does nothing", function () {
        var output = {
            "test": "file"
        };
        config.transform(output).should.equal(output);
    })
});

describe("#fetchLocales", function () {
    let api, loader;

    before(function () {
        loader = new PhraseappLoader({
            access_token: 1,
            project_id: 1
        });
    });

    beforeEach(function () {
        api = nock("https://api.phraseapp.com")
            .get("/v2/projects/1/locales")
            .query({access_token: 1})
            .reply(200, [
                {
                    "id": "1",
                    "name": "de",
                    "code": "de",
                    "default": false,
                    "main": false,
                    "rtl": false,
                    "plural_forms": [
                        "zero",
                        "one",
                        "other"
                    ],
                    "created_at": "2015-07-13T15:56:07Z",
                    "updated_at": "2015-07-13T15:56:07Z",
                    "source_locale": null
                },
                {
                    "id": "2",
                    "name": "en",
                    "code": "en",
                    "default": true,
                    "main": false,
                    "rtl": false,
                    "plural_forms": [
                        "zero",
                        "one",
                        "other"
                    ],
                    "created_at": "2015-07-13T15:55:44Z",
                    "updated_at": "2015-07-13T15:55:45Z",
                    "source_locale": null
                }
            ]);
    });

    afterEach(function () {
        api.isDone();
    });

    it("has two locales", function (done) {
        loader.fetchLocales(function (err, res) {
            if (err) return done(err);
            res.should.have.length(2);
            done();
        });
    });

    it("is an array", function (done) {
        loader.fetchLocales(function (err, res) {
            if (err) return done(err);
            res.should.be.an("array");
            done();
        });
    });

    it("contains German and English", function (done) {
        loader.fetchLocales(function (err, res) {
            if (err) return done(err);
            res.should.have.members(["de", "en"]);
            done();
        });
    });
});

describe("#downloadTranslationFiles", function () {
    let api, loader;

    before(function () {
        loader = new PhraseappLoader({
            access_token: 1,
            project_id: 1
        });
    });

    beforeEach(function () {
        api = nock("https://api.phraseapp.com")
            .persist()
            .get("/v2/projects/1/locales/en/download")
            .query({access_token: 1, file_format: "node_json"})
            .reply(200, {
                "greeting": "Hi, %s",
                "navigation.search": "Search",
                "navigation.shopping_cart": "Shopping Cart",
                "navigation.sign_in": "Sign In",
                "navigation.wishlist": "Wishlist"
            });
    });

    it("downloads the translation file", function (done) {
        loader.downloadTranslationFile('en', function (err, res) {
            if (err) return done(err);
            fs.exists(res, function (res) {
                done();
            });
        });
    });

    it("has the correct contents in the translation file", function (done) {
        let fileContents, apiFileContents, fileName;

        request("https://api.phraseapp.com/v2/projects/1/locales/en/download?access_token=1&file_format=node_json",
            function (err, res, body) {
                if (res.statusCode === 200 && !err) {
                    apiFileContents = JSON.parse(body);

                    loader.downloadTranslationFile('en', function (err, res) {
                        if (err) return done(err);
                        fileName = res;
                        fileContents = JSON.parse(fs.readFileSync(fileName).toString());
                        fileContents.should.deep.equal(apiFileContents);
                        done();
                    });
                } else {
                    done(err);
                }
            });
    });

    afterEach(function () {
        fs.unlinkSync(loader.options.location + "/en.js");
        api.isDone();
    });
});

describe("#download", function () {
    let api, loader;

    before(function () {
        loader = new PhraseappLoader({
            access_token: 1,
            project_id: 1
        });

        api = nock("https://api.phraseapp.com")
            .persist()
            .get("/v2/projects/1/locales/en/download")
            .query({access_token: 1, file_format: "node_json"})
            .reply(200, {
                "greeting": "Hi, %s",
                "navigation.search": "Search",
                "navigation.shopping_cart": "Shopping Cart",
                "navigation.sign_in": "Sign In",
                "navigation.wishlist": "Wishlist"
            })
            .get("/v2/projects/1/locales/de/download")
            .query({access_token: 1, file_format: "node_json"})
            .reply(200, {
                "greeting": "Hallo, %s",
                "navigation.search": "Suchen",
                "navigation.shopping_cart": "Einkaufswagen",
                "navigation.sign_in": "Anmeldung",
                "navigation.wishlist": "Wunschzettel"
            })
            .get("/v2/projects/1/locales")
            .query({access_token: 1})
            .reply(200, [
                {
                    "id": "1",
                    "name": "de",
                    "code": "de",
                    "default": false,
                    "main": false,
                    "rtl": false,
                    "plural_forms": [
                        "zero",
                        "one",
                        "other"
                    ],
                    "created_at": "2015-07-13T15:56:07Z",
                    "updated_at": "2015-07-13T15:56:07Z",
                    "source_locale": null
                },
                {
                    "id": "2",
                    "name": "en",
                    "code": "en",
                    "default": true,
                    "main": false,
                    "rtl": false,
                    "plural_forms": [
                        "zero",
                        "one",
                        "other"
                    ],
                    "created_at": "2015-07-13T15:55:44Z",
                    "updated_at": "2015-07-13T15:55:45Z",
                    "source_locale": null
                }
            ]);
    });

    after(function () {
        api.isDone();
        fs.unlinkSync(loader.options.location + "/en.js");
        fs.unlinkSync(loader.options.location + "/de.js");
    });

    it("downloads all of the files", function (done) {
        loader.download(function (err, res) {
            if (err) return done(err);

            fs.existsSync(loader.options.location + "/en.js");
            fs.existsSync(loader.options.location + "/de.js");

            done();
        });
    });

    it("has the correct contents in the downloaded files", function (done) {
        const apiFileContents = {};
        const fileContents = {};

        request("https://api.phraseapp.com/v2/projects/1/locales/en/download?access_token=1&file_format=node_json",
            function (err, res, body) {
                if (res.statusCode === 200 && !err) {
                    apiFileContents['en'] = JSON.parse(body);
                }

                request("https://api.phraseapp.com/v2/projects/1/locales/de/download?access_token=1&file_format=node_json",
                    function (err, res, body) {
                        if (res.statusCode === 200 && !err) {
                            apiFileContents['de'] = JSON.parse(body);
                        }

                        loader.download(function (err, res) {
                            if (err) return done(err);

                            fileContents['en'] = JSON.parse(fs.readFileSync(loader.options.location + "/en.js").toString());
                            fileContents['de'] = JSON.parse(fs.readFileSync(loader.options.location + "/de.js").toString());

                            fileContents.should.deep.equal(apiFileContents);

                            done();
                        });
                    });
            }
        );
    });

    it("transforms the data correctly", function (done) {
        const fileContents = {};

        loader.configure({
            transform: function (data) {
                return _.extend(data, {
                    test_key: 'hello'
                });
            }
        });

        loader.download(function (err, res) {
            if (err) return done(err);

            fileContents['en'] = fs.readFileSync(loader.options.location + "/en.js").toString();

            JSON.parse(fileContents['en']).should.contain.key('test_key');

            done();
        });
    });
});

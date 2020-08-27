"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SLRU = require("stale-lru-cache");
var url = require("url");
var EventEmitter = require("events").EventEmitter;

// fork of https://github.com/mpfdavis/outputcache
module.exports = function (_EventEmitter) {
    _inherits(OutputCache, _EventEmitter);

    function OutputCache() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, OutputCache);

        var _this = _possibleConstructorReturn(this, (OutputCache.__proto__ || Object.getPrototypeOf(OutputCache)).call(this));

        _this.ttl = { maxAge: options.ttl || 600, staleWhileRevalidate: _this.staleWhileRevalidate || 0 };
        _this.maxItems = options.maxItems || 1000;
        _this.staleWhileRevalidate = options.staleWhileRevalidate;
        _this.varyByCookies = Array.isArray(options.varyByCookies) ? options.varyByCookies : [];
        _this.varyByQuery = options.varyByQuery === false ? false : Array.isArray(options.varyByQuery) ? options.varyByQuery : [];
        _this.skip4xx = options.skip4xx;
        _this.skip3xx = options.skip3xx;
        _this.skip5xx = options.skip5xx;
        _this.noHeaders = options.noHeaders;
        _this.useCacheHeader = options.useCacheHeader;
        _this.allowSkip = options.allowSkip === false ? false : true;
        _this.caseSensitive = options.caseSensitive === false ? false : true;
        _this.cacheProvider = options.cacheProvider || {
            cache: new SLRU({
                maxSize: _this.maxItems,
                maxAge: _this.ttl,
                staleWhileRevalidate: _this.staleWhileRevalidate
            }),
            get: function get(key) {
                return new Promise(function (resolve) {
                    resolve(_this.cacheProvider.cache.get(key));
                });
            },
            set: function set(key, item, ttl) {
                _this.cacheProvider.cache.set(key, item, ttl);
            }
        };
        _this.middleware = _this.middleware.bind(_this);
        _this._header = "x-output-cache";
        return _this;
    }

    _createClass(OutputCache, [{
        key: "middleware",
        value: function middleware(req, res, next) {
            var _this2 = this;

            var urlParsed = url.parse(req.originalUrl || req.url, true);
            var isSkipForced = this.allowSkip && (req.headers[this._header] === "ms" || urlParsed.query.cache === "false" || req.cookies && req.cookies[this._header] === "ms");
            var cacheKey = "p-" + urlParsed.pathname;

            if (!this.noHeaders) {
                res.setHeader(this._header, "ms");
            }

            if (isSkipForced) {
                this.emit("miss", { url: urlParsed.path });
                return next();
            }

            if (this.varyByQuery && Object.keys(urlParsed.query).length) {
                if (this.varyByQuery.length) {
                    for (var i = 0; i < this.varyByQuery.length; i++) {
                        if (urlParsed.query[this.varyByQuery[i]]) {
                            cacheKey += "-q-" + this.varyByQuery[i] + "=" + urlParsed.query[this.varyByQuery[i]];
                        }
                    }
                } else {
                    cacheKey += "-q-" + urlParsed.search;
                }
            }

            if (req.cookies) {
                for (var _i = 0; _i < this.varyByCookies.length; _i++) {
                    if (req.cookies[this.varyByCookies[_i]]) {
                        cacheKey += "-c-" + this.varyByCookies[_i] + "=" + req.cookies[this.varyByCookies[_i]];
                    }
                }
            }

            cacheKey = this.caseSensitive ? cacheKey : cacheKey.toLowerCase();

            this.cacheProvider.get(cacheKey).then(function (cacheResult) {

                if (cacheResult) {

                    var result = JSON.parse(cacheResult);

                    if (!_this2.noHeaders) {
                        result.headers[_this2._header] = "ht " + result.ttl.maxAge + " " + result.ttl.staleWhileRevalidate;
                    }

                    _this2.emit("hit", result);
                    res.writeHead(result.status, result.headers);
                    return res.end(result.body);
                } else {

                    res.endOverride = res.end;
                    _this2.emit("miss", { url: urlParsed.path });

                    res.end = function (data, encoding, cb) {

                        //deep clone
                        var headers = JSON.parse(JSON.stringify(res._headers || res.headers || {}));

                        if (!headers["cache-control"]) {
                            headers["cache-control"] = "max-age=" + _this2.ttl.maxAge + (_this2.staleWhileRevalidate ? ", stale-while-revalidate=" + _this2.staleWhileRevalidate : "");
                        }

                        var ttl = _this2.useCacheHeader === false ? _this2.ttl : _this2.parseCacheControl(headers["cache-control"]);
                        var isSkipStatus = _this2.skip3xx && res.statusCode >= 300 && res.statusCode < 400 || _this2.skip4xx && res.statusCode >= 400 && res.statusCode < 500 || _this2.skip5xx && res.statusCode >= 500;

                        if (!isSkipStatus && ttl.maxAge) {

                            var cacheItem = {
                                ttl: ttl,
                                headers: headers,
                                key: cacheKey,
                                status: res.statusCode,
                                body: data ? data.toString() : undefined,
                                url: urlParsed.path
                            };
                            _this2.cacheProvider.set(cacheKey, JSON.stringify(cacheItem), ttl);
                        }
                        return res.endOverride(data, encoding, cb);
                    };
                    return next();
                }
            }).catch(function (err) {
                _this2.emit("miss", { url: urlParsed.path });
                _this2.emit("cacheProviderError", err);
                return next();
            });
        }

        //10x faster than regex

    }, {
        key: "parseCacheControl",
        value: function parseCacheControl(header) {
            var options = { maxAge: 0, staleWhileRevalidate: 0 },
                pos = 0,
                seconds = 0;
            if (header) {
                header = header.toLowerCase();
                if (header.includes("no-cache") || header.includes("no-store") || header.includes("private")) {
                    return options;
                } else {
                    pos = header.indexOf("max-age=");
                    seconds = pos !== -1 ? parseInt(header.substr(pos + 8), 10) : NaN;
                    if (seconds >= 0) {
                        options.maxAge = seconds;
                    }
                    pos = header.indexOf("stale-while-revalidate=");
                    seconds = pos !== -1 ? parseInt(header.substr(pos + 23), 10) : NaN;
                    if (seconds >= 0) {
                        options.staleWhileRevalidate = seconds;
                    }
                }
            }
            return options;
        }
    }]);

    return OutputCache;
}(EventEmitter);
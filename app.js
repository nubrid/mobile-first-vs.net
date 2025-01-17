﻿"use strict";
const _argv = require("yargs")
  .usage("Usage: $0 [options]")
  .example("$0")
  .example("$0 -s")
  .example("$0 -s true")
  .example("$0 -s true -r https -c -p 443")
  .options({
    c: {
      alias: "use-cluster",
      describe: "Use node.js clustering",
      nargs: 0,
    },
    p: {
      alias: "port",
      describe: "Listening port",
      nargs: 1,
    },
    r: {
      alias: "redirect",
      describe: "Redirect to protocol:\nhttp\nhttps",
      nargs: 1,
    },
    s: {
      alias: "secure",
      default: true,
      describe: "Use secure HTTPS protocol (default)",
      nargs: 0,
    },
  })
  .boolean(["s"])
  .help("h")
  .alias("h", "help")
  .epilog("copyright 2016").argv;

const _config = require("./app.config"),
  _cluster = require("cluster"),
  port =
    process.env.PORT ||
    _argv.p ||
    (_argv.s ? _config.web.sslPort : _config.web.port);

if (_cluster.isMaster && (_argv.c || _config.web.useCluster)) {
  // Fork workers.
  for (
    let i = 0,
      numCPUs = require("os").cpus().length,
      multiplier = port < 100 ? 100 : port < 1000 ? 10 : 1;
    i < numCPUs;
    i++ // eslint-disable-line no-plusplus
  ) {
    _cluster.fork({ PORT: i === 0 ? port : port * multiplier + i });
  }

  _cluster.on(
    "exit",
    (worker /*, code, signal*/) =>
      console.log(`worker ${worker.process.pid} died`), // eslint-disable-line no-console
  );
  module.exports = null;

  return;
}

const express = require("express"),
  router = express.Router(); // eslint-disable-line new-cap

router.use((request, response, next) => {
  const protocol = request.header("x-forwarded-proto") || request.protocol,
    host = request.header("host");

  if (
    _argv.s &&
    `${protocol}://${host}/` !== request.header("referrer") &&
    request.path.startsWith("/js/") &&
    !request.path.endsWith(".map")
  ) {
    console.log(`CSRF: ${request.path} ${request.headers["user-agent"]}`); // eslint-disable-line no-console
    response.send("rainbows and unicorns!");
    response.end();
    return;
  }

  request.sessionOptions.maxAge =
    request.session.maxAge || request.sessionOptions.maxAge; // cookie-session
  if (_argv.r && _argv.r !== protocol) {
    response.writeHead(301, { Location: `${_argv.r}://${host}${request.url}` });
    response.end();

    return;
  }

  next();
});

const passport = require("passport"),
  passportRedirect = {
    successRedirect: "/success",
    failureRedirect: "/failed",
  },
  popupTools = require("popup-tools"),
  popupResponse = isSuccess => {
    return (request, response) => {
      response.set({ "content-type": "text/html; charset=utf-8" });
      response.end(popupTools.popupResponse(isSuccess ? request.user : null));
    };
  };
router.get("/success", popupResponse(true));
router.get("/failed", popupResponse());

router.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    display: "touch",
    //, scope: [
    //	"read_stream"
    //	, "publish_actions"
    //]
  }),
);

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", passportRedirect),
);

router.get(
  "/auth/twitter",
  passport.authenticate("twitter", {
    //scope: [
    //	"read_stream"
    //	, "publish_actions"
    //]
  }),
);

router.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", passportRedirect),
  popupResponse,
);

router.get(
  "/auth/linkedin",
  passport.authenticate("linkedin", {
    //scope: [
    //	"read_stream"
    //	, "publish_actions"
    //]
  }),
);

router.get(
  "/auth/linkedin/callback",
  passport.authenticate("linkedin", passportRedirect),
  popupResponse,
);

const FacebookStrategy = require("passport-facebook").Strategy,
  TwitterStrategy = require("passport-twitter").Strategy,
  LinkedInStrategy = require("passport-linkedin").Strategy;

passport.serializeUser((user, done) => {
  const { id, displayName, provider } = user; // NOTE: https://stackoverflow.com/questions/38471404/passport-js-express-google-oauth-502-bad-gateway-on-nginx
  done(null, { id, displayName, provider });
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: _config.fb.clientID,
      clientSecret: _config.fb.clientSecret,
      callbackURL: "/auth/facebook/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      if (process.env.NODE_ENV === "development") console.log(profile); // eslint-disable-line no-console
      process.nextTick(() => done(null, profile));
    },
  ),
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: _config.twit.consumerKey,
      consumerSecret: _config.twit.consumerSecret,
      callbackURL: "/auth/twitter/callback",
    },
    (token, tokenSecret, profile, done) => {
      if (process.env.NODE_ENV === "development") console.log(profile); // eslint-disable-line no-console
      return done(null, profile);
    },
  ),
);

passport.use(
  new LinkedInStrategy(
    {
      consumerKey: _config.linkedin.consumerKey,
      consumerSecret: _config.linkedin.consumerSecret,
      callbackURL: "/auth/linkedin/callback",
    },
    (token, tokenSecret, profile, done) => {
      if (process.env.NODE_ENV === "development") console.log(profile); // eslint-disable-line no-console
      process.nextTick(() => done(null, profile));
    },
  ),
);

const app = express(),
  compression = require("compression"),
  cookieParser = require("cookie-parser"),
  bodyParser = require("body-parser"),
  cookieSession = require("cookie-session"),
  helmet = require("helmet");
// TODO: DEPRECATED: appCache = require("connect-cache-manifest");
//, cookie = { secure: false }; // session

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieSession({ secret: "8AC782B6-0219-499B-A8EF-ABAE4325C513" }));
//app.use( session( { secret: "8AC782B6-0219-499B-A8EF-ABAE4325C513", resave: false, saveUninitialized: true, cookie: cookie } ) );

app.use(passport.initialize());
app.use(passport.session());

app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());

// TODO: app.use( helmet.hpkp( {
// 	maxAge: _config.web.maxAge.hpkp
// 	, sha256s: [ "", "" ] // public keys
// 	, includeSubdomains: true
// 	, setIf: ( request/*, response*/ ) => request.secure
// 	, reportUri: "/report-violation"
// 	, reportOnly: true // deployment mode
// } ) );

app.use(helmet.hsts({ maxAge: _config.web.maxAge.hsts, preload: true })); // TODO: Submit to Google (https://hstspreload.appspot.com)
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: "no-referrer-when-downgrade" })); // TODO: In order of priority: strict-origin-when-cross-origin, strict-origin, no-referrer-when-downgrade, same-origin, no-referrer
app.use(helmet.xssFilter());

//app.use( helmet.contentSecurityPolicy( {
//	defaultSrc: [ "'self'", "gap:", "https://ssl.gstatic.com" ],
//	scriptSrc: [ "'self'", "*.nubrid.com:*", "http://*.nubrid.com:*", "*.cloudflare.com:*", "*.googleapis.com:*", "fb.me:*", "*.akamaihd.net:*" ],
//	imgSrc: [ "'self'", "data:" ],
//	connectSrc: [ "ws://*.nubrid.com:*", "ws://nubrid.dlinkddns.com:*", "wss://*.nubrid.com:*", "wss://nubrid.dlinkddns.com:*" ],
//	mediaSrc: [ "*" ],
//	reportUri: "/report-violation",
//	reportOnly: false, // set to true if you only want to report errors
//	setAllHeaders: false, // set to true if you want to set all headers
//	disableAndroid: false, // set to true if you want to disable Android (browsers can vary and be buggy)
//	safari5: false // set to true if you want to force buggy CSP in Safari 5
//} ) );
// For helmet.contentSecurityPolicy()
//router.post( "/report-violation", ( request, response ) => {
//	if ( request.body ) {
//		console.log( `CSP Violation: ${request.body}` );
//	} else {
//		console.log( "CSP Violation: No data received!" );
//	}

//	response.status( 204 ).end();
//} );

app.use("/", router);

// TODO: Use ServiceWorker caching
// let serve = null;

if (process.env.NODE_ENV === "production") {
  // TODO: Use ServiceWorker caching
  // serve = require("st")({
  //   path: _config.web.dir,
  //   index: "index.html",
  //   cache: { content: { maxAge: _config.web.maxAge.content } },
  //   gzip: true,
  //   passthrough: true,
  // });

  app.set("trust proxy", 1);
  //cookie.secure = true; // session

  // TODO: DEPRECATED: app.use(
  //   appCache({
  //     manifestPath: "/.appcache",
  //     cdn: [], // TODO: All CDN files specified in main.config.js
  //     files: [
  //       {
  //         dir: "src",
  //         prefix: "/",
  //         ignore: x => /(\.dev\.html|\.home\.html)$/.test(x),
  //       },
  //     ],
  //     networks: ["*"],
  //     fallbacks: [],
  //   }),
  // );
} else {
  // TODO: Use ServiceWorker caching
  // const serveStatic = require("serve-static");
  // serve = serveStatic(_config.web.dir, {
  //   index: "index.dev.html",
  //   maxAge: _config.web.maxAge.content,
  //   setHeaders: (response, path) => {
  //     if (serveStatic.mime.lookup(path) === "text/html")
  //       response.setHeader("Cache-Control", "public, max-age=86400");
  //   },
  // });

  const webpack = require("webpack"),
    webpackConfig = require("./webpack.config");
  const webpackCompiler = webpack({
      ...webpackConfig,
      ...{ output: { ...webpackConfig.output, ...{ path: "/" } } },
    }),
    webpackMiddleware = require("webpack-dev-middleware"),
    webpackHotMiddleware = require("webpack-hot-middleware");

  app.use(
    webpackMiddleware(webpackCompiler, {
      publicPath: webpackConfig.output.publicPath,
      stats: {
        assets: true,
        chunks: true,
        chunkModules: false,
        colors: true,
        hash: false,
        timings: false,
        version: false,
      },
    }),
  );
  app.use(
    webpackHotMiddleware(webpackCompiler, {
      log: console.log, // eslint-disable-line no-console
      path: "/__webpack_hmr",
      heartbeat: 10 * 1000,
    }),
  );
}

// TODO: Use ServiceWorker caching
// app.use(serve);

let server = null,
  primus = null;
(() => {
  const http = require(_argv.s ? "https" : "http");
  http.globalAgent.maxSockets = _config.web.maxSockets;

  if (_argv.s) {
    const fs = require("fs");

    server = http.createServer(
      {
        ca: [fs.readFileSync(_config.web.sslCa)],
        key: fs.readFileSync(_config.web.sslKey),
        cert: fs.readFileSync(_config.web.sslCrt),
        // Default since v0.10.33, secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2
      },
      app,
    );
  } else server = http.createServer(app);

  const Primus = require("primus.io");
  primus = new Primus(server, { transformer: _config.primus.transformer });
})();

// TODO: Replace PouchDB logic
// const PouchDB = require( "pouchdb-core" )
// 	// .plugin( require( "pouchdb-adapter-leveldb" ) )
// 	// .plugin( require( "pouchdb-mapreduce" ) )
// 	// .plugin( require( "pouchdb-replication" ) )
// 	, proxyquire = require( "proxyquire" );

// proxyquire.noCallThru();
// const engineStub = {}
// 	// HACK: Override pouchdb with pouchdb-core to ensure leveldown is not loaded
// 	, makePouchCreatorStub = proxyquire( "socket-pouch/lib/server/make-pouch-creator", {
// 		"pouchdb": PouchDB
// 	} )
// 	, pouchServer = proxyquire( "socket-pouch/lib/server", {
// 		"engine.io": engineStub
// 		, "./make-pouch-creator": makePouchCreatorStub
// 	} );

// // HACK: Override engine.io with primus
// engineStub.listen = () => primus;
// primus.on( "connection", spark => {
// 	spark.on( "data", message => {
// 		const sparkMessage = spark.emits( "message" );
// 		sparkMessage( message.data[ 0 ] );
// 	} );
// } );

// proxyquire.callThru();
// const encodingStub = {}
// 	, sqldown = proxyquire( "sqldown", { "./encoding": encodingStub } );

// // HACK: Disable SQLDown encoding
// encodingStub.encode = ( value, isValue ) => isValue ? JSON.stringify( value ) : value;
// encodingStub.decode = ( value, isValue ) => isValue ? JSON.parse( value ) : value;

// const db = function SQLdown () {
// 	return sqldown( `postgres://${_config.db.user}:${_config.db.password}@${_config.db.host}/${_config.db.database}` );
// };
// db.destroy = sqldown.destroy;

// pouchServer.listen( 8000, { // HACK: Port is ignored
// 	pouchCreator( name ) {
// 		// return new PouchDB( {
// 		// 	name
// 		// 	, db
// 		// 	, table: "sqldown"
// 		// // Return a promise with { pouch: <PouchDB Instance> }
// 		// } ).then( response => Object.assign( response, { pouch: response } ) ); // eslint-disable-line lodash/prefer-lodash-method
// 		const pouchDB = new PouchDB( {
// 			name
// 			, db
// 			, table: "sqldown"
// 		} );

// 		// Return a promise with { pouch: <PouchDB Instance> }
// 		return pouchDB.info().then( ( /*response*/ ) => Object.assign( pouchDB, { pouch: pouchDB } ) ); // eslint-disable-line lodash/prefer-lodash-method
// 	}
// } );

server.listen(port);

module.exports = {
  port,
  primus,
  server,
};

/* Express 기본 모듈 불러오기 */
var express = require('express'),
    http = require('http'),
    path = require('path');

/* Express 미들웨어 불러오기 */
var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    static = require('serve-static'),
    errorHandler = require('errorhandler');

/* 오류 핸들러 모듈 사용 */
var expressErrorHandler = require('express-error-handler');

/* 세션 미들웨어 불러오기 */
var expressSession = require('express-session');

/* Passport 사용 */
var passport = require('passport');
var flash = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy;

/* Socket.io 모듈 불러오기 */
var socketio = require('socket.io');

/* CORS 사용 - 클라이언트에서 ajax로 요청하면 CORS 지원 */
var cors = require('cors');

/* Express 객체 생성 */
var app = express();
var user = require('./routes/user');

/* Express 객체 기본 속성 설정 */
app.set('port',process.env.PORT || 3000);

/* 뷰 엔진 설정 */
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

/* body-parser를 사용해 application/x-www-form-urlencoded 파싱 */
app.use(bodyParser.urlencoded({extended:false}));

/* body-parser를 사용해 application/json 파싱 */
app.use(bodyParser.json());

/* public 폴더를 static으로 오픈 */
app.use('/public',static(path.join(__dirname,'/public')));

/* cookie-parser 설정 */
app.use(cookieParser());

/* 세션 설정 */
app.use(expressSession({
    secret:'my key',
    resave:true,
    saveUninitialized:true
}));

/* Passport 사용 설정 */
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

/* cors를 미들웨어로 사용하도록 등록 */
app.use(cors());

/* 몽고디비 모듈 사용 */
var mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
/* 데이터베이스 객체를 위한 변수 선언 */
var database;

/* 데이터베이스 모델 객체를 위한 변수 선언 */
var UserModel;

/* crypto 모듈 불러들이기 */
var crypto = require('crypto');

/* 데이터베이스에 연결 */
function connectDB(){
    // 데이터베이스 연결 정보
    var databaseUrl = 'mongodb://localhost:27017/local';
    
    // 데이터베이스 연결
    console.log('데이터베이스 연결을 시도합니다.');
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseUrl, {useNewUrlParser:true});
    database = mongoose.connection;
    
    database.on('error',console.error.bind(console, 'mongoose connection error.'));
    database.on('open', function(){
        console.log('데이터베이스에 연결되었습니다. : ' + databaseUrl);
        
        // user 스키마 및 모델 객체 생성
        UserSchema = require('./database/user_schema').createSchema(mongoose);
        
        // UserModel 모델 정의
        UserModel = mongoose.model('users', UserSchema);
        console.log('UserModel 정의함.');
        
        user.init(database, UserSchema, UserModel);
    });
    
    // 연결 끊어졌을 때 5초후 재연결
    database.on('disconnected',function(){
        console.log('연결이 끊어졌습니다. 5초 후 다시 연결합니다.');
        setInterval(connectDB, 5000);
    });
}

/* 패스포트 로그인 설정 */
passport.use('local-login', new LocalStrategy({
    usernameField : 'id',
    passwordField : 'password',
    passReqToCallback : true
}, function(req, id, password, done){
    console.log('passport의 local-login 호출됨 : ' + id + ', ' + password);
    
    UserModel.findOne({'id' : id}, function(err, member){
        if(err) {return done(err);}
        
        // 등록된 사용자가 없는 경우
        if(!member){
            console.log('계정이 일치하지 않음.');
            return done(null, false, req.flash('loginMessage', '등록된 계정이 없습니다.'));
        }
        
        // 비밀번호를 비교하여 맞지 않는 경우
        var authenticated = member.authenticate(password, member._doc.salt, member._doc.hashed_password);
        if(!authenticated) {
            console.log('비밀번호 일치하지 않음.');
            return done(null, false, req.flash('loginMessage', '비밀번호가 일치하지 않습니다.'));
        }
        
        // 정상인 경우
        console.log('계정과 비밀번호가 일치함.');
        return done(null, member);
    });
}));

/* 패스포트 회원가입 설정 */
passport.use('local-signup', new LocalStrategy({
    usernameField : 'id',
    passwordField : 'password',
    passReqToCallback : true
}, function(req, id, password, done){
    // 요청 파라미터 중 name 파라미터 확인
    var paramName = req.body.name || req.query.name;
    console.log('passport의 local-signup 호출됨 : ' + id + ', ' + password + ', ' + paramName);
    
    // User.findOne이 blocking되므로 async 방식으로 변경할 수도 있음
    process.nextTick(function(){
        UserModel.findOne({'id' : id}, function(err, member){
            // 오류가 발생하면
            if(err){
                return done(err);
            }
            
            // 기존에 이메일이 있다면
            if(member){
                console.log('기존에 계정이 있음.');
                return done(null, false, req.flash('signupMessage', '이미 존재하는 계정입니다.'));
            } else {
                // 모델 인스턴스 객체 만들어 저장
                var member = new UserModel({'id' : id, 'password' : password, 'name' : paramName});
                member.save(function(err){
                    if(err) {throw err;}
                    console.log('사용자 데이터 추가함.');
                    return done(null, member);
                });
            }
        });
    });
}));

/* 사용자 인증에 성공했을 때 호출 */
passport.serializeUser(function(member, done){
    console.log('serializeUser() 호출됨.');
    
    done(null, member);
});

/* 사용자 인증 이후 사용자 요청이 있을 때마다 호출 */
passport.deserializeUser(function(member, done){
    console.log('deserializeUser() 호출됨.');
    
    done(null, member);
});

/* 라우터 객체 참조 */
var router = express.Router();

/* 홈 페이지 */
router.route('/').get(function(req, res){
    console.log('/ 패스 요청됨.');
    res.render('index.ejs');
});

/* 로그인 폼 링크 */
app.get('/login', function(req, res){
    console.log('/login 패스 요청됨.');
    res.render('login.ejs', {message : req.flash('loginMessage')});
});

app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/',
    failureRedirect : '/login',
    failureFlash : true
}));

/* 회원가입 폼 링크 */
app.get('/signup', function(req, res){
    console.log('/signup 패스 요청됨.');
    res.render('signup.ejs', {message : req.flash('signupMessage')});
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/login',
    failureRedirect : '/signup',
    failureFlash : true
}));

/* 프로필 화면 - 로그인 여부를 확인할 수 있도록 먼저 isLoggedIn 미들웨어 실행 */
router.route('/profile').get(function(req, res){
    console.log('/profile 패스 요청됨.');
    
    // 인증이 안 된 경우
    if(!req.user){
        console.log('사용자 인증이 안 된 상태임.');
        res.redirect('/');
        return;
    }
    
    // 인증된 경우
    console.log('사용자 인증된 상태임.');
    if(Array.isArray(req.user)){
        res.render('profile.ejs', {user: req.user[0]._doc});
    } else {
        res.render('profile.ejs', {user: req.user});
    }
});

/* 로그아웃 */
app.get('/logout', function(req, res){
    console.log('/logout 패스 요청됨.');
    req.logout();
    res.redirect('/');
});

/* 로그인 라우팅 함수 - 데이터베이스의 정보와 비교 */
//router.route('/process/login').post(user.login);

//router.route('/process/adduser').post(user.adduser);

/* 사용자 리스트 함수 */
//router.route('/process/listuser').post(user.listuser);

/* 라우터 객체 등록 */
app.use('/',router);

/* 404 오류 페이지 처리 */
var errorHandler = expressErrorHandler({
    static:{
        '404':'../Project/public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

/* 서버 시작 */
var server = http.createServer(app).listen(app.get('port'),function(){
    console.log('서버가 시작되었습니다. 포트 : ',app.get('port'));
    
    // 데이터베이스 연결
    connectDB();
});

/* socket.io 서버를 시작 */
var io = socketio.listen(server);
console.log('socket.io 요청을 받아들일 준비가 되었습니다.');

// 로그인 아이디 매핑(로그인 ID -> 소켓 ID)
var login_ids = {};

io.on('connection', function(socket){
    console.log('connection info : ', socket.request.connection._peername);
    
    socket.remoteAddress = socket.request.connection._peername.address;
    socket.remotePort = socket.request.connection._peername.port;
    
    // 'message' 이벤트를 받았을 때의 처리
    socket.on('message', function(message){
        console.log('message 이벤트를 받았습니다.');
        
        if(message.recepient == 'ALL'){
            // 나를 포함한 모든 클라이언트에게 메시지 전달
            io.sockets.emit('message', message);
        } else {
            // 일대일 채팅 대상에게 메시지 전달
            if(login_ids[message.recepient]){
                io.sockets.connected[login_ids[message.recepient]].emit('message', message);
                
                // 응답 메시지 전송
                sendResponse(socket, 'message', '200', '메시지를 전송했습니다.');
            } else {
                // 응답 메시지 전송
                sendResponse(socket, 'login', '404', '상대방의 로그인 ID를 찾을 수 없습니다.');
            }
        }
    });
    
    // 'login' 이벤트를 받았을 때의 처리
    socket.on('login', function(login){
        console.log('login 이벤트를 받았습니다.');
        
        // 기존 클라이언트 ID가 없으면 클라이언트 ID를 맵에 추가
        console.log('접속한 소켓의 ID : ' + socket.id);
        login_ids[login.id] = socket.id;
        socket.login_id = login.id;
        
        console.log('접속한 클라이언트 ID 개수 : %d', Object.keys(login_ids).length);
        
        // 응답 메시지 전송
        sendResponse(socket, 'login', '200', '로그인되었습니다.');
    });
    
    // room 이벤트를 받았을 때의 처리
    socket.on('room', function(room){
        console.log('room 이벤트를 받았습니다.');
        
        if(room.command == 'create'){
            if(io.sockets.adapter.rooms[room.roomId]) { // 방이 이미 만들어져 있는 경우
                console.log('방이 이미 만들어져 있습니다.');
            } else {
                console.log('방을 새로 만듭니다.');
                
                socket.join(room.roomId);
                
                var curRoom = io.sockets.adapter.rooms[room.roomId];
                curRoom.id = room.roomId;
                curRoom.name = room.roomName;
                curRoom.owner = room.roomOwner;
            }
        } else if(room.command == 'update'){
            var curRoom = io.sockets.adapter.rooms[room.roomId];
            curRoom.id = room.roomId;
            curRoom.name = room.roomName;
            curRoom.owner = room.roomOwner;
        } else if(room.command == 'delete'){
            socket.leave(room.roomId);
            
            if(io.sockets.adapter.rooms[room.roomId]){ // 방이 만들어져 있는 경우
                delete io.sockets.adapter.rooms[room.roomId];
            } else { // 방이 만들어져 있지 않은 경우
                console.log('방이 만들어져 있지 않습니다.');
            }
        }
        
        var roomList = getRoomList();
        
        var output = {command : 'list', rooms : roomList};
        console.log('클라이언트로 보낼 데이터 : ' + JSON.stringify(output));
        
        io.sockets.emit('room', output);
    });
});

function sendResponse(socket, command, code, message){
    var statusObj = {command : command, code : code, message : message};
    socket.emit('response', statusObj);
}

function getRoomList() {
    console.dir(io.sockets.adapter.rooms);
    
    var roomList = [];
    
    Object.keys(io.sockets.adapter.rooms).forEach(function(roomId){ // 각각의 방에 대해 처리
        console.log('current room id : ' + roomId);
        var outRoom = io.sockets.adapter.rooms[roomId];
        
        // find default room using all attributes
        var foundDefault = false;
        var index = 0;
        Object.keys(outRoom.sockets).forEach(function(key){
            console.log('#' + index + ' : ' + key + ', ' + outRoom.sockets[key]);
            
            if(roomId == key){
                foundDefault = true;
                console.log('this is default room.');
            }
            index++;
        });
        
        if(!foundDefault){
            roomList.push(outRoom);
        }
    });
    console.log('[ROOM LIST]');
    console.dir(roomList);
    
    return roomList;
}
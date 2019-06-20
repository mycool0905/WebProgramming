var database;
var UserSchema;
var UserModel;

var init = function(db, schema, model){
    console.log('init 호출됨.');
    
    database = db;
    UserSchema = schema;
    UserModel = model;
}

/* 사용자를 인증하는 함수 */
var authUser = function(database, id, password, callback){
    console.log('authUser 호출됨 : ' + id + ', ' + password);
    
    // 1. 아이디를 사용해 검색
    // 모델 객체의 findById() 메소드를 호출할 때는 id 값과 콜백 함수를 전달한다.
    // 콜백 함수에서 결과 데이터를 배열로 받으면 그 배열 객체에 데이터가 있는지 확인한다.
    // 데이터가 있는 경우에는 첫 번째 배열 요소의 _doc 속성을 참조한다.
    // _doc 속성은 각 문서 객체의 정보를 담고 있어 그 안에 있는 password 속성 값을 확인할 수 있다.
    UserModel.findById(id, function(err,results){
        if(err){
            callback(err,null);
            return;
        }
        
        console.log('아이디 [%s]로 사용자 검색 결과', id);
        
        if(results.length>0){
            console.log('아이디와 일치하는 사용자 찾음.');
            
            // 2. 비밀번호 확인
            var user = new UserModel({id : id});
            var authenticated = user.authenticate(password, results[0]._doc.salt, results[0]._doc.hashed_password);
            if(authenticated){
                console.log('비밀번호 일치함');
                callback(null, results);
            } else {
                console.log('비밀번호 일치하지 않음');
                callback(null, null);
            }
        } else {
            console.log('아이디와 일치하는 사용자를 찾지 못함.');
            callback(null,null);
        }
    });
}

/* 사용자를 등록하는 함수 */
var addUser = function(database, id, password, name, callback){
    console.log('addUser 호출됨.');
    
    // UserModel의 인스턴스 생성
    var user = new UserModel({'id' : id, 'password' : password, 'name' : name});
    
    // save()로 저장
    user.save(function(err){
        if(err){
            callback(err, null);
            return;
        }
        console.log('사용자 데이터 추가함.');
        callback(null, user);
        
    });
};

var login = function(req,res){
    console.log('/process/login 호출됨.');
    
    var paramId = req.body.id;
    var paramPassword = req.body.password;
    
    if(database){
        authUser(database, paramId, paramPassword, function(err,docs){
            if(err) {throw err;}
            
            if(docs){
                var username = docs[0].name;
                res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
                
                // 뷰 템플릿을 사용하여 렌더링한 후 전송
                var context = {userid:paramId, username:username};
                req.app.render('login_success', context, function(err,html){
                    if(err){
                        console.error("뷰 렌더링 중 오류 발생 : " + err.stack);
                        
                        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                        res.write('<h2>뷰 렌더링 중 오류 발생</h2>');
                        res.write('<p>' + err.stack + '</p>');
                        res.end();
                        
                        return;
                    }
                    console.log('rendered : ' + html);
                    
                    res.end(html);
                })
            } else {
                res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
                res.write('<h1>로그인 실패</h1>');
                res.write('<div><p>아이디와 비밀번호를 다시 확인하십시오.</p></div>');
                res.write('<br><br><a href="../../public/login.html">다시 로그인하기</a>');
                res.end();
            }
        });
    } else {
        res.writeHead('200',{'Content-Type':'text/html;charset=utf8'});
        res.write('<h2>데이터베이스 연결 실패</h2>');
        res.write('<div><p>데이터베이스에 연결하지 못했습니다.</p></div>');
        res.end();
    }
};

var adduser = function(req, res){
    console.log('/process/adduser 호출됨.');
    
    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;
    
    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword + ', ' + paramName);
    
    // 데이터베이스 객체가 초기화된 경우, addUser 함수 호출하여 사용자 추가
    if(database) {
        addUser(database, paramId, paramPassword, paramName, function(err,result){
            if(err) {throw err;}
            
            // 결과 객체 확인하여 추가된 데이터 있으면 성공 응답 전송
            if(result && result.insertedCount > 0){
                console.dir(result);
                
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8}'});
                res.write('<h2>사용자 추가 성공</h2>');
                res.end();
            } else { // 결과 객체가 없으면 실패 응답 전송
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8}'});
                res.write('<h2>사용자 추가 실패</h2>');
                res.end();
            }
        });
    } else { // 데이터베이스 객체가 초기화되지 않은 경우 실패 응답 전송
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8}'});
        res.write('<h2>데이터베이스 연결 실패</h2>');
        res.end();
    }
};

module.exports.init = init;
module.exports.login = login;
module.exports.adduser = adduser;
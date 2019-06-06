var crypto = require('crypto');

var Schema = {};

Schema.createSchema = function(mongoose){
    
    // 스키마 정의
    // required : 필수 속성, 필수적으로 값이 있어야하는 튜플 (NOT NULL)
    // unique : 고유한 값 (Primary key, Unique key)
    // password를 hashed_password로 변경, default 속성 모두 추가, salt 속성 추가
    var UserSchema = mongoose.Schema({
        id: {type: String, required: true, unique: true, 'default' : ' '}, 
        hashed_password: {type: String, required: true, 'default' : ' '},
        salt : {type: String, required: true},
        // name은 hashed 인덱싱 해놓는다.
        name: {type: String, index: 'hashed', 'default' : ' '},
        // 입력을 안하면 default 값으로 -1을 넣어둔다.
        age: {type: Number, 'default' : -1},
        // Date type으로 생성 시각과 수정 시각을 정하고 default 값으로 현재 시각을 넣어둔다.
        created_at: {type: Date, index : {unique : false}, 'default' : Date.now},
        updated_at: {type: Date, index : {unique : false}, 'default' : Date.now}
    });
    
    // password를 virtual 메소드로 정의 : MongoDB에 저장되지 않는 편리한 속성임. 특정 속성을 지정하고 set, get 메소드를 정의함
    UserSchema
        .virtual('password')
        .set(function(password){
            this._password = password;
            this.salt = this.makeSalt();
            this.hashed_password = this.encryptPassword(password);
            console.log('virtual password 호출됨 : ' + this.hashed_password);
    })
    .get(function(){return this._password});
    
    
    // encryptPassword() 메소드와 makeSalt() 메소드는 스키마 객체의 method() 메소드를 사용해 모델 인스턴스 객체에서
    // 호출할 수 있는 메소드로 추가됩니다. makeSalt() 메소드는 Math.random() 메소드를 호출하면서 랜덤 값을 하나 만들어낸다.
    // encryptPassword() 메소드는 비밀번호와 salt 값을 파라미터로 전달받은 후 crypto 모듈로 암호화한다.
    
    // 스키마에 모델 인스턴스에서 사용할 수 있는 메소드 추가
    // 비밀번호 암호화 메소드
    UserSchema.method('encryptPassword', function(plainText, inSalt){
        if(inSalt){
            return crypto.createHmac('sha1', inSalt).update(plainText).digest('hex');
        } else {
            return crypto.createHmac('sha1', this.salt).update(plainText).digest('hex');
        }
    });
    
    // salt 값 만들기 메소드
    UserSchema.method('makeSalt', function(){
        return Math.round((new Date().valueOf() * Math.random())) + '';
    });
    
    // 인증 메소드 - 입력된 비밀번호와 비교 (true/false 리턴)
    // authenticate 메소드는 파라미터로 전달된 비밀번호와 암호화된 비밀번호가 같은지 비교한다.
    // 데이터베이스에 저장할 문서 데이터 중에서 필수 속성인데도 값이 없는 경우를 체크하기 위해 validate() 함수를 사용할 수 있다.
    
    UserSchema.method('authenticate', function(plainText, inSalt, hashed_password){
        if(inSalt){
            console.log('authenticate 호출됨 : %s -> %s : %s', plainText, this.encryptPassword(plainText, inSalt), hashed_password);
            return this.encryptPassword(plainText, inSalt) == hashed_password;
        } else {
            console.log('authenticate 호출됨 : %s -> %s : %s', plainText, this.encryptPassword(plainText), this.hashed_password);
            return this.encryptPassword(plainText) == hashed_password;
        }
    });
    
    // 스키마 객체의 path() 메소드를 호출한 후 validate() 메소드를 호출하면 유효한 값인지 확인할 수 있다.
    // id 속성 값을 확인하여 입력된 값이 유효한지 알려 준다.
    // 필수 속성에 대한 유효성 확인(길이 값 체크)
    UserSchema.path('id').validate(function(id){
        return id.length;
    }, 'id 칼럼의 값이 없습니다.');
    
    UserSchema.path('name').validate(function(name){
        return name.length;
    }, 'name 칼럼의 값이 없습니다.');
    
    console.log('UserSchema 정의함.');
    
    return UserSchema;
};

/* module.exports에 UserSchema 객체 직접 할당 */
module.exports = Schema;
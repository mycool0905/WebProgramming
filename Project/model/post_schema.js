var Schema = {};

Schema.createSchema = function(mongoose){
    
    // 스키마 정의
    // required : 필수 속성, 필수적으로 값이 있어야하는 튜플 (NOT NULL)
    // unique : 고유한 값 (Primary key, Unique key)
    var PostSchema = mongoose.Schema({
        id: {type: String, index: 'hashed', required: true},
        title: {type: String, index: 'hashed', required: true, 'default': ''},
        content: {type: String},
        photo: {type: String},
        price: {type: Number},
        bidder: {type: String}
    });
    
    // 스키마 객체의 path() 메소드를 호출한 후 validate() 메소드를 호출하면 유효한 값인지 확인할 수 있다.
    // title, id 속성 값을 확인하여 입력된 값이 유효한지 알려 준다.
    // 필수 속성에 대한 유효성 확인(길이 값 체크)
    PostSchema.path('id').validate(function(id){
        return id.length;
    }, 'id 칼럼의 값이 없습니다.');
    
    PostSchema.path('title').validate(function(title){
        return title.length;
    }, 'title 칼럼의 값이 없습니다.');
    
    console.log('PostSchema 정의함.');
    
    return PostSchema;
};

/* module.exports에 UserSchema 객체 직접 할당 */
module.exports = Schema;
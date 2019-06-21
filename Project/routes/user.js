var database;
var UserSchema;
var UserModel;

var init = function(db, schema, model){
    database = db;
    UserSchema = schema;
    UserModel = model;
}

module.exports.init = init;
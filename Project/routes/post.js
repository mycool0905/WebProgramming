var database;
var PostSchema;
var PostModel;

var init = function(db, schema, model){
    database = db;
    PostSchema = schema;
    PostModel = model;
}

module.exports.init = init;
var pf = require('permafrost');
var nStore = require('nStore');

function tmpfile () {
    var hash = (Math.random() * Math.pow(2, 32)).toString(16);
    return '/tmp/' + hash + '.db';
}

exports.attrs = function (assert) {
    var filename = tmpfile();
    
    var db = nStore(filename);
    db.set = db.save.bind(db);
    db.all_ = db.all;
    db.all = function (cb) {
        db.all_(function (err, values, keys) {
            if (err) cb(err)
            else cb(err,
                keys.slice(1).map(function (x) { return x.key }),
                values.slice(1)
            )
        });
    };
    
    pf(db, { a : 1 }, function (err, obj) {
        if (err) assert.fail(err);
        assert.eql(obj.a, 1);
        obj.b = 3;
        obj.a ++;
        obj.c = [3,4];
    });
    
    setTimeout(function () {
        pf(db, function (err, obj) {
            assert.eql(obj, { a : 2, b : 3, c : [3,4] });
        });
    }, 1000);
};

exports.remove = function (assert) {
    var filename = tmpfile();
    
    var db = nStore(filename, function () {
        pf(filename, {}, function (err, obj) {
            if (err) assert.fail(err);
            
            obj.a = 3;
            obj.b = [ 4, 5 ];
            obj.c = [ 6, 7, { d : 8, f : 9 } ];
            delete obj.b[1];
            delete obj.c;
        });
        
        setTimeout(function () {
            pf(filename, {}, function (err, obj) {
                assert.eql(obj, { a : 3, b : [4] });
            });
        }, 1000);
    });
};
module.exports = Persist;

var Store = require('supermarket');

function Persist (filename, def, cb) {
    if (cb === undefined) { cb = def; def = {} }
    Store({ filename : filename, json : true }, function (err, db) {
        if (err) cb(err)
        else load(db, def, cb);
    });
}

var Hash = require('traverse/hash');
var Traverse = require('traverse');
var EventEmitter = require('events').EventEmitter;

function load (db, def, cb) {
    db.join(function (rows) {
        var keyed = Hash.zip(
            rows.map(function (r) { return r.key }),
            rows.map(function (r) { return r.value })
        );
        
        var root = (function walk (ps) {
            var obj = keyed[ps.join('.')];
            if (typeof obj != 'object') return obj;
            
            var res = Array.isArray(obj) ? [] : {};
            Hash(obj).forEach(function (value, key) {
                var ps_ = ps.concat(key);
                var has = keyed.hasOwnProperty(ps_.join('.'));
                if (value === undefined && has) {
                    res[key] = walk(ps.concat(key));
                }
                else {
                    res[key] = value;
                }
            });
            return res;
        })([]);
        
        if (rows.length == 0) root = def;
        
console.dir({ root : root });
        
        var em = new EventEmitter;
        em.on('set', function (ps, value) {
            console.log(ps.join('.') + ' = ' + value);
        });
        
        cb(null, Wrapper(root, [], em));
    });
}

var Proxy = require('node-proxy');

function Wrapper (obj, path, em) {
    if (typeof obj != 'object') return obj;
    
    return Proxy.create({
        get : function (recv, name) {
            var ps = path.concat(name);
            return obj.hasOwnProperty(name)
                ? Wrapper(obj[name], ps, em) : undefined
            ;
        },
        set : function (recv, name, value) {
            if (typeof value === 'function') {
                em.emit('error', new Error('Cannot persist functions'));
            }
            else {
                var ps = path.concat(name);
                var res = (obj[name] = Persist(value, ps));
                em.emit('set', ps, res);
                return res;
            }
        },
        enumerate : function () {
            return Object.keys(obj);
        },
        delete : function (name) {
            delete obj[name];
            em.emit('delete', path.concat(name));
            return true;
        },
        fix : function () {
            return undefined;
        },
    }, Object.getPrototypeOf(obj));
};
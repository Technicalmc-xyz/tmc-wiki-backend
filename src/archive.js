var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _a = require('../utils/utils'), cast = _a.cast, sanitizeFilename = _a.sanitizeFilename;
var _b = require('fs'), existsSync = _b.existsSync, readdirSync = _b.readdirSync, statSync = _b.statSync;
var index = function (req, res) {
    var lsFiles = readdirSync('./archive/');
    var response = {};
    var id = 0;
    lsFiles.forEach((file) => {
        if (file === '.nodelete') {
            return;
        }
        var stats = statSync("./archive/" + file);
        var name = file;
        var size = stats.size;
        var created = stats.ctime;
        response[id] = {
            'name': name,
            'size': size / 1000,
            'created': created.toISOString(),
            'link': "/archive/" + name
        };
        id++;
    });
    res.send((response));
};
exports.index = index;
var download = function (req, res) {
    var fileName = cast('string', req.params.fileName);
    fileName = sanitizeFilename(fileName);
    var filePath = "./archive/" + fileName;
    if (fileName === '.nodelete' || !existsSync(filePath)) {
        res.status(404).send("Archive not found: " + fileName);
        return;
    }
    res.download(filePath);
};
exports.download = download;
var uploadProcess = function (req, res) { return __awaiter(_this, void 0, void 0, function () {
    var file, fileName, fileExt, filePrefix, path, id;
    return __generator(this, (_a) => {
        switch (_a.label) {
            case 0:
                file = req.files.file;
                fileName = sanitizeFilename(file.name);
                fileExt = (fileName.split('.').pop());
                filePrefix = fileName.split('.').slice(0, -1).join('.');
                if (!fileName.includes('.') || fileName === '.nodelete' || (fileExt !== 'litematic' && fileExt !== 'schematic' && fileExt !== 'nbt')) {
                    res.redirect('/');
                    return [2];
                }
                path = "./archive/" + fileName;
                id = 1;
                while (existsSync(path)) {
                    path = "./archive/" + filePrefix + "-" + id + "." + fileExt;
                    id++;
                }
                return [4, file.mv(path)];
            case 1:
                _a.sent();
                res.redirect('/archive');
                return [2];
        }
    });
}); };
exports.uploadProcess = uploadProcess;
//# sourceMappingURL=archive.js.map
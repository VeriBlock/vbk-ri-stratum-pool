var util = require('./util')
var BigNumber = require('bignumber.js');

var PopPayout = function (payout_info_hex, amount) {
    this.payoutInfo = payout_info_hex
    this.amount = amount;
}

var PopPayload = function (id, data) {
    this.id = id;
    this.data = data;
}

var PopData = function (version, vbks, vtbs, atvs) {
    this.version = version;
    this.vbks = vbks
    this.vtbs = vtbs
    this.atvs = atvs
}

const bigNumberRightShift = (b, bits) => {
    const p = new BigNumber(2).pow(bits);
    return b.dividedToIntegerBy(p);
};

// https://github.com/VeriBlock/alt-integration-cpp/blob/878c92a3e764a9d9955469c9f62e6d15f53c5f7a/src/serde.cpp#L28
const trimmedArray = function (n) {
    var x = 8;
    n = new BigNumber(n)
    if (n.isNegative()) {
        // if n=-1, make it = 0xffffffffffffffff
        n = new BigNumber('0xffffffffffffffff', 16).plus(n).plus(1);
    }

    do {
        const c = bigNumberRightShift(n, (x - 1) * 8);
        if (c.comparedTo(0) !== 0) {
            break;
        }
        x--;
    } while (x > 1);

    const trimmedByteArray = Buffer.alloc(Number(x));
    for (let i = 0; i < x; i++) {
        const c = n.mod(256).toNumber(); // equivalent of (n & 0xff)
        trimmedByteArray.writeUInt8(c, x - i - 1);
        n = bigNumberRightShift(n, 8);
    }

    return trimmedByteArray;
};

var writeIntBigendian = function (value) {
    var b = Buffer.alloc(4)
    b[0] = (value >> 24) & 0xff
    b[1] = (value >> 16) & 0xff
    b[2] = (value >> 8) & 0xff
    b[3] = value & 0xff
    return b
}

var writeKeystone = function (keystoneHex) {
    var ks = Buffer.from(keystoneHex, 'hex')
    var len = Buffer.from([ks.length & 0xff])
    return Buffer.concat([len, ks])
}

// https://github.com/VeriBlock/alt-integration-cpp/blob/878c92a3e764a9d9955469c9f62e6d15f53c5f7a/src/serde.cpp#L85
var writeSingleBEvalue = function (value) {
    var bytes = trimmedArray(value)
    var len = Buffer.from([bytes.length & 0xff])
    return Buffer.concat([len, bytes])
}

var encodePayload = function (buf, listOfPayloadsData) {
    var be = writeSingleBEvalue(listOfPayloadsData.length)
    var stream = Buffer.concat([buf, be])
    listOfPayloadsData.forEach((x) => {
        var data = Buffer.from(x.data, 'hex')
        stream = Buffer.concat([stream, data])
    })

    return stream
}

var encodePopData = function (popData) {
    var buf = writeIntBigendian(popData.version)
    buf = encodePayload(buf, popData.vbks)
    buf = encodePayload(buf, popData.vtbs)
    buf = encodePayload(buf, popData.atvs)
    return util.serializeString(buf)
}

var parseField = function (from, field, converter = (x) => x) {
    if (from[field] !== undefined) {
        return converter(from[field])
    } else {
        throw new Error(`Can't read field ${field} from ${from}`)
    }
}

var calculateContextInfoHash = function (height, ks1hex, ks2hex) {
    var buf = Buffer.concat([
        writeIntBigendian(height),
        writeKeystone(ks1hex),
        writeKeystone(ks2hex)
    ])

    return util.sha256d(buf)
}

var parsePopFields = function (object, gbt) {
    try {
        var height = parseField(gbt, 'height')
        var ks1 = parseField(gbt, 'pop_first_previous_keystone')
        var ks2 = parseField(gbt, 'pop_second_previous_keystone')
        object.popContextInfoHash = calculateContextInfoHash(height, ks1, ks2)
        object.popDataRoot = Buffer.from(parseField(gbt, 'pop_data_root'), 'hex')
        object.popRewards = parseField(gbt, 'pop_rewards', (d) =>
            d.map((x) => new PopPayout(
                parseField(x, "payout_info", (x) => Buffer.from(x, 'hex')),
                parseField(x, "amount"),
            )))

        var parsePopPayloads = (x) => x.map((d) => new PopPayload(
            parseField(d, 'id'),
            parseField(d, 'data')
        ))
        object.popData = parseField(gbt, "pop_data", (x) => new PopData(
            parseField(x, 'version'),
            parseField(x, 'vbkblocks', parsePopPayloads),
            parseField(x, 'vtbs', parsePopPayloads),
            parseField(x, 'atvs', parsePopPayloads),
        ))
        object.popSupported = true
    } catch (e) {
        // pop is not supported if thrown
        object.popSupported = false
    }

    return object.popSupported
}

module.exports = {
    parsePopFields,
    encodePopData,
    PopData,
    PopPayload
}

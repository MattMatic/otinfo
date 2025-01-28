// Extended from https://github.com/danbovey/fontname
// Extended to access the GPOS and GSUB scriptTable and featureTable
// github.com/MattMatic 2025-01-24

(function(global, factory) {
  if (typeof define === "function" && define.amd) define(factory);
  else if (typeof module === "object") module.exports = factory();
  else global.OTInfo = factory();
})(this, function() {
  var OTInfo = {};

  OTInfo.parse = function(buff) {
    var bin = OTInfo._bin;
    var data = new Uint8Array(buff);
    var tag = bin.readASCII(data, 0, 4);

    // If the file is a TrueType Collection
    if (tag == "ttcf") {
      var offset = 8;
      var numF = bin.readUint32(data, offset);
      offset += 4;
      var fnts = [];
      for (var i = 0; i < numF; i++) {
        var foff = bin.readUint32(data, offset);
        offset += 4;
        fnts.push(OTInfo._readFont(data, foff));
      }
      return fnts;
    } else {
      return [OTInfo._readFont(data, 0)];
    }
  };

  OTInfo._readFont = function(data, offset) {
    var bin = OTInfo._bin;
    var tables = {};
    tables.scripts = new Set();
    tables.languages = new Set();
    tables.features = new Set();
    offset += 4;
    var numTables = bin.readUint16(data, offset);
    offset += 8;

    for (var i = 0; i < numTables; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 8;
      var toffset = bin.readUint32(data, offset);
      offset += 4;
      var tlength = bin.readUint32(data, offset);
      offset += 4;
      tag = tag.replace('/', '_'); // e.g. for 'OS/2' -> 'OS_2'
      if (OTInfo[tag] && OTInfo[tag].parse) {
        tables[tag] = OTInfo[tag].parse(data, toffset, tlength, tables);
      } else {
        //tables[tag] = {toffset, tlength};
      }
    }
    return tables;
    //throw new Error('Failed to parse file');
  };

  OTInfo._bin = {
    readUint16: function(buff, p) {
      return (buff[p] << 8) | buff[p + 1];
    },
    readInt16: function(buff, p) {
      var v = OTInfo._bin.readUint16(buff, p);
      if (v >= 32768) v-=65536;
      return v;
    },
    readUint32: function(buff, p) {
      var a = OTInfo._bin.t.uint8;
      a[3] = buff[p];
      a[2] = buff[p + 1];
      a[1] = buff[p + 2];
      a[0] = buff[p + 3];
      return OTInfo._bin.t.uint32[0];
    },
    readTag: function(buff, p) {
      return OTInfo._bin.readASCII(buff, p, 4);
    },
    readUint64: function(buff, p) {
      return (
        OTInfo._bin.readUint32(buff, p) * (0xffffffff + 1) +
        OTInfo._bin.readUint32(buff, p + 4)
      );
    },
    /**
     * @param {number} l length in Characters (not Bytes)
     */
    readASCII: function(buff, p, l) {
      var s = "";
      for (var i = 0; i < l; i++) {
        s += String.fromCharCode(buff[p + i]);
      }
      return s;
    },
    readUnicode: function(buff, p, l) {
      var s = "";
      for (var i = 0; i < l; i++) {
        var c = (buff[p++] << 8) | buff[p++];
        s += String.fromCharCode(c);
      }
      return s;
    }
  };

  OTInfo._bin.t = { buff: new ArrayBuffer(8) };
  OTInfo._bin.t.int8 = new Int8Array(OTInfo._bin.t.buff);
  OTInfo._bin.t.uint8 = new Uint8Array(OTInfo._bin.t.buff);
  OTInfo._bin.t.int16 = new Int16Array(OTInfo._bin.t.buff);
  OTInfo._bin.t.uint16 = new Uint16Array(OTInfo._bin.t.buff);
  OTInfo._bin.t.int32 = new Int32Array(OTInfo._bin.t.buff);
  OTInfo._bin.t.uint32 = new Uint32Array(OTInfo._bin.t.buff);

  OTInfo.name = {};
  OTInfo.name.parse = function(data, offset) {
    var bin = OTInfo._bin;
    var obj = {};
    offset += 2;
    var count = bin.readUint16(data, offset);
    offset += 2;
    offset += 2;

    var names = [
      "copyright",
      "fontFamily",
      "fontSubfamily",
      "ID",
      "fullName",
      "version",
      "postScriptName",
      "trademark",
      "manufacturer",
      "designer",
      "description",
      "urlVendor",
      "urlDesigner",
      "licence",
      "licenceURL",
      "---",
      "typoFamilyName",
      "typoSubfamilyName",
      "compatibleFull",
      "sampleText",
      "postScriptCID",
      "wwsFamilyName",
      "wwsSubfamilyName",
      "lightPalette",
      "darkPalette",
      "preferredFamily",
      "preferredSubfamily",
    ];

    var offset0 = offset;

    for (var i = 0; i < count; i++) {
      var platformID = bin.readUint16(data, offset);
      offset += 2;
      var encodingID = bin.readUint16(data, offset);
      offset += 2;
      var languageID = bin.readUint16(data, offset);
      offset += 2;
      var nameID = bin.readUint16(data, offset);
      offset += 2;
      var slen = bin.readUint16(data, offset);
      offset += 2;
      var noffset = bin.readUint16(data, offset);
      offset += 2;

      var cname = names[nameID];
      if (!cname) cname = '#'+nameID;
      var soff = offset0 + count * 12 + noffset;
      var str;
      if (platformID == 0) {
        str = bin.readUnicode(data, soff, slen / 2);
      } else if (platformID == 3 && encodingID == 0) {
        str = bin.readUnicode(data, soff, slen / 2);
      } else if (encodingID == 0) { 
        str = bin.readASCII(data, soff, slen);
      } else if (encodingID == 1) {
        str = bin.readUnicode(data, soff, slen / 2);
      } else if (encodingID == 3) {
        str = bin.readUnicode(data, soff, slen / 2);
      } else if (platformID == 1) {
        str = bin.readASCII(data, soff, slen);
        console.log("reading unknown MAC encoding " + encodingID + " as ASCII");
      } else {
        throw new Error("unknown encoding " + encodingID + ", platformID: " + platformID);
      }

      var tid = "p" + platformID + "," + languageID.toString(16);
      if (obj[tid] == null) {
        obj[tid] = {};
      }
      obj[tid][cname] = str;
      obj[tid]._lang = languageID;
    }

    for (var p in obj) {
      if (obj[p].postScriptName != null) {
        return obj[p];
      }
    }

    var tname;
    for (var p in obj) {
      tname = p;
      break;
    }
    console.log("returning name table with languageID " + obj[tname]._lang);
    return obj[tname];
  };


  OTInfo.GSUB = {};
  OTInfo.GPOS = {};
  OTInfo.GSUB.parse = function(data, offset, length, tables) {
    return OTInfo._gt.parse(data, offset, length, tables);
  };
  OTInfo.GPOS.parse = function(data, offset, length, tables) {
    return OTInfo._gt.parse(data, offset, length, tables);
  };
  OTInfo._gt = {};
  OTInfo._gt.parse = function(data, offset, length, tables) {
    var tableStart = offset;
    var bin = OTInfo._bin;
    var majorVersion = bin.readUint16(data, offset);
    offset += 2;
    var minorVersion = bin.readUint16(data, offset);
    offset += 2;
    var scriptListOffset = bin.readUint16(data, offset);
    offset += 2;
    var featureListOffset = bin.readUint16(data, offset);
    var result = {};
    result.scriptTable = OTInfo.scriptListTable.parse(data, tableStart + scriptListOffset, length, tables);
    result.featureListTable = OTInfo.featureListTable.parse(data, tableStart + featureListOffset, length, tables);
    return result;
  };

  OTInfo.scriptListTable = {};
  OTInfo.scriptListTable.parse = function(data, offset, length, tables) {
    var scriptListStart = offset;
    var bin = OTInfo._bin;
    var scriptCount = bin.readUint16(data, offset);
    scriptCount = Math.min(scriptCount, 256);
    offset += 2;
    var scriptList = {};
    while (scriptCount > 0) {
      var scriptTag = bin.readTag(data, offset);
      offset += 4;
      var scriptOffset = bin.readUint16(data, offset);
      offset += 2;
      //console.log('scriptTag', scriptTag);
      tables.scripts.add(scriptTag);
      scriptList[scriptTag] = OTInfo.scriptTable.parse(data, scriptListStart + scriptOffset, length, tables);
      scriptCount--;
    }
    return scriptList;
  };

  OTInfo.scriptTable = {};
  OTInfo.scriptTable.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var defaultLangSysOffset = bin.readUint16(data, offset);
    offset += 2;
    var langSysCount = bin.readUint16(data, offset);
    langSysCount = Math.min(langSysCount, 256);
    //console.log('scriptTable', defaultLangSysOffset, langSysCount);
    offset += 2;
    var langRecords = new Set();
    while (langSysCount > 0) {
      var langSysTag = bin.readTag(data, offset);
      offset += 4;
      var langSysOffset = bin.readUint16(data, offset);
      offset += 2;
      tables.languages.add(langSysTag);
      langRecords.add(langSysTag);
      langSysCount--;
    }
    return langRecords;
  };

  OTInfo.featureListTable = {};
  OTInfo.featureListTable.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var featureCount = bin.readUint16(data, offset);
    offset += 2;
    var featureRecords = new Set();
    while (featureCount > 0) {
      var featureTag = bin.readTag(data, offset);
      offset += 4;
      var featureOffset = bin.readUint16(data, offset);
      offset += 2;
      featureCount--;
      featureRecords.add(featureTag);
      tables.features.add(featureTag);
    }
    return featureRecords;
  };

  OTInfo.meta = {};
  OTInfo.meta.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var metaOffset = offset;
    var version = bin.readUint32(data, offset);
    offset += 4;
    var flags = bin.readUint32(data, offset);
    offset += 4;
    var reserved = bin.readUint32(data, offset);
    offset += 4;
    var dataMapsCount = bin.readUint32(data, offset);
    offset += 4;

    var metaRecords = {};
    while (dataMapsCount > 0) {
      var tag = bin.readTag(data, offset);
      offset += 4;
      var dataOffset = bin.readUint32(data, offset);
      offset += 4;
      var dataLength = bin.readUint32(data, offset);
      offset += 4;
      metaRecords[tag] = bin.readASCII(data, dataOffset + metaOffset, dataLength);
      dataMapsCount--;
    }
    return metaRecords;
  }

  OTInfo.head = {}
  OTInfo.head.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var t = {};
    t.tableVersion = bin.readUint16(data, offset) + (bin.readUint16(data, offset+2) / 0x1000 / 10);
    offset += 4;
    t.fontRevision = bin.readInt16(data, offset) + (bin.readUint16(data, offset+2) / 65535.0); // Fixed (32 bit signed 16.16)
    t.fontRevision = Math.round(t.fontRevision * 1000) / 1000;
    offset += 4;
    offset += 8;
    t.flags = bin.readUint16(data, offset);
    offset += 2;
    t.unitsPerEm = bin.readUint16(data, offset);
    offset += 2;
    t.created = bin.readUint64(data, offset);
    offset += 8;
    t.modified = bin.readUint64(data, offset);
    offset += 8;
    t.xMin = bin.readInt16(data, offset);  offset += 2;
    t.yMin = bin.readInt16(data, offset);  offset += 2;
    t.xMax = bin.readInt16(data, offset);  offset += 2;
    t.yMax = bin.readInt16(data, offset);  offset += 2;
    // ignore the rest
    return t;
  }

  OTInfo.OS_2 = {}
  OTInfo.OS_2.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var t = {};
    t.version = bin.readUint16(data, offset);           offset+=2;
    t.xAvgCharWidth = bin.readInt16(data, offset);      offset+=2;
    t.usWeightClass = bin.readUint16(data, offset);     offset+=2;
    t.usWidthClass  = bin.readUint16(data, offset);     offset+=2;
    t.fsType        = bin.readUint16(data, offset);     offset+=2;
    t.fsTypeText = '';
    switch (t.fsType & 0x0f) {
      case 0: t.fsTypeText += 'Installable-embedding '; break;
      case 2: t.fsTypeText += 'Restricted '; break;
      case 4: t.fsTypeText += 'Preview/print '; break;
      case 8: t.fsTypeText += 'Editable-embedding '; break;
    }
    if (t.fsType & 0x100) t.fsTypeText += 'no-subset ';
    if (t.fsType & 0x200) t.fsTypeText += 'bitmap-embed ';
    t.ySubscriptXSize = bin.readInt16(data, offset);    offset+=2;
    t.ySubscriptYSize = bin.readInt16(data, offset);    offset+=2;
    t.ySubscriptXOffset = bin.readInt16(data, offset);  offset+=2;
    t.ySubscriptYOffset = bin.readInt16(data, offset);  offset+=2;
    t.ySuperscriptXSize = bin.readInt16(data, offset);  offset+=2;
    t.ySuperscriptYSize = bin.readInt16(data, offset);  offset+=2;
    t.ySuperscriptXOffset = bin.readInt16(data, offset); offset+=2;
    t.ySuperscriptYOffset = bin.readInt16(data, offset); offset+=2;
    t.yStrikeoutSize = bin.readInt16(data, offset);     offset+=2;
    t.yStrikeoutPosition = bin.readInt16(data, offset); offset+=2;
    t.sFamilyClass = bin.readInt16(data, offset);       offset+=2;
    offset += 10; // panose
    offset += 16; // UnicodeRange1-4
    t.achVendorID = bin.readTag(data, offset);          offset+=4;
    t.fsSelection = bin.readUint16(data, offset);       offset+=2;
    t.usFirstCharIndex = bin.readUint16(data, offset);  offset+=2;
    t.usLastCharIndex = bin.readUint16(data, offset);   offset+=2;
    t.sTypoAscender = bin.readInt16(data, offset);      offset+=2;
    t.sTypoDescender = bin.readInt16(data, offset);     offset+=2;
    t.sTypoLineGap = bin.readInt16(data, offset);       offset+=2;
    t.usWinAscent = bin.readUint16(data, offset);       offset+=2;
    t.usWinDescent = bin.readUint16(data, offset);      offset+=2;
    t.ulCodePageRange1 = bin.readUint32(data, offset);  offset+=4;
    t.ulCodePageRange2 = bin.readUint32(data, offset);  offset+=4;
    t.sxHeight = bin.readInt16(data, offset);           offset+=2;
    t.sCapHeight = bin.readInt16(data, offset);         offset+=2;
    t.usDefaultChar = bin.readUint16(data, offset);     offset+=2;
    t.usBreakChar = bin.readUint16(data, offset);       offset+=2;
    t.usLowerOpticalPointSize = bin.readUint16(data, offset); offset+=2;
    t.usUpperOpticalPointSize = bin.readUint16(data, offset); offset+=2;
    return t;
  }

  OTInfo.maxp = {};
  OTInfo.maxp.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var t = {};
    t.tableVersion = bin.readUint16(data, offset) + (bin.readUint16(data, offset+2) >> 24) / 10;
    offset+=4;
    t.numGlyphs = bin.readUint16(data, offset);             offset+=2;
    t.maxPoints = bin.readUint16(data, offset);             offset+=2;
    t.maxContours = bin.readUint16(data, offset);           offset+=2;
    t.maxCompositePoints = bin.readUint16(data, offset);    offset+=2;
    t.maxCompositeContours = bin.readUint16(data, offset);  offset+=2;
    t.maxZones = bin.readUint16(data, offset);              offset+=2;
    t.maxTwilightPoints = bin.readUint16(data, offset);     offset+=2;
    t.maxStorage = bin.readUint16(data, offset);            offset+=2;
    t.maxFunctionDefs = bin.readUint16(data, offset);       offset+=2;
    t.maxInstructionDefs = bin.readUint16(data, offset);    offset+=2;
    t.maxStackElements = bin.readUint16(data, offset);      offset+=2;
    t.maxSizeOfInstructions =bin.readUint16(data, offset);  offset+=2;
    t.maxComponentElements = bin.readUint16(data, offset);  offset+=2;
    t.maxComponentDepth = bin.readUint16(data, offset);     offset+=2;
    return t;
  };

  OTInfo.hhea = {};
  OTInfo.hhea.parse = function(data, offset, length, tables) {
    var bin = OTInfo._bin;
    var t = {};
    t.tableVersion = bin.readUint16(data, offset) + (bin.readUint16(data, offset+2) / 0x1000 / 10);
    offset += 4;
    t.ascender = bin.readInt16(data, offset);               offset+=2;
    t.descender = bin.readInt16(data, offset);              offset+=2;
    t.lineGap = bin.readInt16(data, offset);                offset+=2;
    t.advanceWidthMax = bin.readUint16(data, offset);       offset+=2;
    t.minLeftSideBearing = bin.readInt16(data, offset);     offset+=2;
    t.minRightSideBearing = bin.readInt16(data, offset);    offset+=2;
    t.xMaxExtent = bin.readInt16(data, offset);             offset+=2;
    // Ignore the rest
    return t;
  };

  return OTInfo;
});

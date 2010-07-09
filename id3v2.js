ID3v2 = {
	parseStream: function(stream, onComplete){
	var tag = {
		pictures: []
	};
	
	
	var max_size = Infinity;
	
	function read(bytes, callback){
		stream(bytes, callback, max_size);
	}
	

	var PICTURE_TYPES = {
		"0": "Other",
		"1": "32x32 pixels 'file icon' (PNG only)",
		"2": "Other file icon",
		"3": "Cover (front)",
		"4": "Cover (back)",
		"5": "Leaflet page",
		"6": "Media (e.g. lable side of CD)",
		"7": "Lead artist/lead performer/soloist",
		"8": "Artist/performer",
		"9": "Conductor",
		"A": "Band/Orchestra",
		"B": "Composer",
		"C": "Lyricist/text writer",
		"D": "Recording Location",
		"E": "During recording",
		"F": "During performance",
		"10": "Movie/video screen capture",
		"11": "A bright coloured fish", //<--- WTF?
		"12": "Illustration",
		"13": "Band/artist logotype",
		"14": "Publisher/Studio logotype",
	}

	var TAGS = {
    "AENC": "Audio encryption",
    "APIC": "Attached picture",
    "COMM": "Comments",
    "COMR": "Commercial frame",
    "ENCR": "Encryption method registration",
    "EQUA": "Equalization",
    "ETCO": "Event timing codes",
    "GEOB": "General encapsulated object",
    "GRID": "Group identification registration",
    "IPLS": "Involved people list",
    "LINK": "Linked information",
    "MCDI": "Music CD identifier",
    "MLLT": "MPEG location lookup table",
    "OWNE": "Ownership frame",
    "PRIV": "Private frame",
    "PCNT": "Play counter",
    "POPM": "Popularimeter",
    "POSS": "Position synchronisation frame",
    "RBUF": "Recommended buffer size",
    "RVAD": "Relative volume adjustment",
    "RVRB": "Reverb",
    "SYLT": "Synchronized lyric/text",
    "SYTC": "Synchronized tempo codes",
    "TALB": "Album/Movie/Show title",
    "TBPM": "BPM (beats per minute)",
    "TCOM": "Composer",
    "TCON": "Content type",
    "TCOP": "Copyright message",
    "TDAT": "Date",
    "TDLY": "Playlist delay",
    "TENC": "Encoded by",
    "TEXT": "Lyricist/Text writer",
    "TFLT": "File type",
    "TIME": "Time",
    "TIT1": "Content group description",
    "TIT2": "Title/songname/content description",
    "TIT3": "Subtitle/Description refinement",
    "TKEY": "Initial key",
    "TLAN": "Language(s)",
    "TLEN": "Length",
    "TMED": "Media type",
    "TOAL": "Original album/movie/show title",
    "TOFN": "Original filename",
    "TOLY": "Original lyricist(s)/text writer(s)",
    "TOPE": "Original artist(s)/performer(s)",
    "TORY": "Original release year",
    "TOWN": "File owner/licensee",
    "TPE1": "Lead performer(s)/Soloist(s)",
    "TPE2": "Band/orchestra/accompaniment",
    "TPE3": "Conductor/performer refinement",
    "TPE4": "Interpreted, remixed, or otherwise modified by",
    "TPOS": "Part of a set",
    "TPUB": "Publisher",
    "TRCK": "Track number/Position in set",
    "TRDA": "Recording dates",
    "TRSN": "Internet radio station name",
    "TRSO": "Internet radio station owner",
    "TSIZ": "Size",
    "TSRC": "ISRC (international standard recording code)",
    "TSSE": "Software/Hardware and settings used for encoding",
    "TYER": "Year",
    "TXXX": "User defined text information frame",
    "UFID": "Unique file identifier",
    "USER": "Terms of use",
    "USLT": "Unsychronized lyric/text transcription",
    "WCOM": "Commercial information",
    "WCOP": "Copyright/Legal information",
    "WOAF": "Official audio file webpage",
    "WOAR": "Official artist/performer webpage",
    "WOAS": "Official audio source webpage",
    "WORS": "Official internet radio station homepage",
    "WPAY": "Payment",
    "WPUB": "Publishers official webpage",
    "WXXX": "User defined URL link frame"
  }
		
	function encode_64(input) {
		var output = "", i = 0, l = input.length,
		key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", 
		chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		while (i < l) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
			if (isNaN(chr2)) enc3 = enc4 = 64;
			else if (isNaN(chr3)) enc4 = 64;
			output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
		}
		return output;
	}



	function parseDuration(ms){
		var msec = parseInt(ms.replace(/\0/g,'')) //leading nulls screw up parseInt
		var secs = Math.floor(msec/1000);
		var mins = Math.floor(secs/60);
		var hours = Math.floor(mins/60);
		var days = Math.floor(hours/24);
	
		return {
			milliseconds: msec%1000,
			seconds: secs%60,
			minutes: mins%60,
			hours: hours%24,
			days: days
		};
	}


	function pad(num){
		var arr = num.toString(2);
		return (new Array(8-arr.length+1)).join('0') + arr;
	}

	//taken from http://github.com/ppiotrowicz/ID3v2-/blob/master/ID3v2Sharp/Header.cs
	function arr2int(data){
		var size = data[0] << 0x15;
		size += data[1] << 14;
		size += data[2] << 7;
		size += data[3];
		return size;
	}


	function parseImage(str){
		var TextEncoding = str.charCodeAt(0);
		str = str.substr(1);
		var MimeTypePos = str.indexOf('\0');
		var MimeType = str.substr(0, MimeTypePos);
		str = str.substr(MimeTypePos+1);
		var PictureType = str.charCodeAt(0);
		var TextPictureType = PICTURE_TYPES[PictureType.toString(16).toUpperCase()];
		str = str.substr(1);
		var DescriptionPos = str.indexOf('\0');
		var Description = str.substr(0, DescriptionPos);
		str = str.substr(DescriptionPos+1);
		var PictureData = str;
		var Magic = PictureData.split('').map(function(e){return String.fromCharCode(e.charCodeAt(0) & 0xff)}).join('');
		return {
			dataURL: 'data:'+MimeType+';base64,'+encode_64(Magic),
			PictureType: TextPictureType,
			Description: Description,
			MimeType: MimeType
		};
	}

	var TAG_HANDLERS = {
		"APIC": function(size, s, a){
			tag.pictures.push(parseImage(s));
		},
		"TLEN": function(size, s, a){
			tag.Length = parseDuration(s);
		}
	};

	function read_frame(){
		read(4, function(frame_id){
			if(frame_id == '\0\0\0\0'){
				onComplete(tag);
				return;
			}
			read(4, function(s, size){
				var intsize = arr2int(size);
				read(2, function(s, flags){
					flags = pad(flags[0]).concat(pad(flags[1]));
				
					read(intsize, function(s, a){
						if(typeof TAG_HANDLERS[frame_id] == 'function'){
							TAG_HANDLERS[frame_id](intsize, s, a);
						}else{
							tag[TAGS[frame_id]] = s;
						}
						read_frame();
					})
				})
			})
		})
	}

	read(3, function(header){
		if(header == "ID3"){
			read(2, function(s, version){
				tag.version = "ID3v2."+version[0]+'.'+version[1];
				read(1, function(s, flags){
					//todo: parse flags
					flags = pad(flags[0]);
					read(4, function(s, size){
						max_size = arr2int(size);
						read(0, function(){}); //signal max
						read_frame()
					})
				})
			})
		}else{
			onComplete(tag);
			return false; //no header found
		}
	})
},

parseURL: function(url, onComplete){
	var xhr = new XMLHttpRequest();
	xhr.open('get', url, true);
	xhr.overrideMimeType('text/plain; charset=x-user-defined');

	var pos = 0, 
			bits_required = 0, 
			handle = function(){},
			maxdata = Infinity;

	function read(bytes, callback, newmax){
		bits_required = bytes;
		handle = callback;
		maxdata = newmax;
	}
	var responseText = '';
	(function(){
		if(xhr.responseText){
			responseText = xhr.responseText;
		}
		if(xhr.responseText.length > maxdata) xhr.abort();

		if(responseText.length > pos + bits_required && bits_required){
			var data = responseText.substr(pos, bits_required);
			var arrdata = data.split('').map(function(e){return e.charCodeAt(0) & 0xff});
			pos += bits_required;
			bits_required = 0;
			if(handle(data, arrdata) === false){
				xhr.abort();
				return;
			}
		}
		setTimeout(arguments.callee, 0);
	})()
	xhr.send(null);
	ID3v2.parseStream(read, onComplete);
}
}



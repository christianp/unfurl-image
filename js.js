var canvas = document.getElementById('canvas');
var source = document.getElementById('source');
var ctx = canvas.getContext('2d');

var input_code = document.getElementById('code');

function make_element(name,attrs,content) {
	var e = document.createElement(name);
	for(var key in attrs) {
		e.setAttribute(key,attrs[key]);
	}
	if(content!==undefined) {
		e.innerHTML = content;
	}
	return e;
}

function Unfurler() {
	this.sliders = {};
	this.used_sliders = {};
	this.transform = function(x,y){ return [x,y]; };

	this.pointsToDraw = 1000;
	var u = this;
	setInterval(function() {
		u.draw();
	},50);

	setInterval(function() {
		u.remove_old_sliders();
	},1000);

	input_code.addEventListener('input', function() {
		u.make_transform();
	}, false);

}
Unfurler.prototype = {
	width: 600,
	height: 600,
	precision: 1,
	slider: function(name,start,end,value,step) {
		this.used_sliders[name] = true;
		if(name in this.sliders) {
			var d = this.sliders[name];
			var range = d.range;
			if(d.start!=start) {
				range.setAttribute('min',start);
			}
			if(d.end!=end) {
				range.setAttribute('max',end);
			}
			if(d.step!=step) {
				range.setAttribute('step',step);
			}
			return this.sliders[name].value;
		} else {
			var li = make_element('li',{'class': 'slider'},'<label>'+name+'</label>');
			var range = make_element('input',{'type':'range',min:start,max:end,value:value || ((start+end)/2),step:step || 1});
			var display = make_element('span',{'class':'value'},range.value);
			li.appendChild(range);
			li.appendChild(display);
			document.getElementById('sliders').appendChild(li);
			var d = this.sliders[name] = {
				value: range.value,
				li: li,
				range: range,
				start: start,
				end: end,
				step: step
			};
			range.addEventListener('input',function() {
				d.value = range.value;
				display.innerText = d.value;
			},false);
			return d.value;
		}
	},

	read_image: function() {
		this.width = source.clientWidth;
		this.height = source.clientHeight;
		canvas.width = this.width*2;
		canvas.height = this.height;

		ctx.drawImage(source,0,0,this.width,this.height);

		this.indata = ctx.getImageData(0,0,this.width,this.height);
		this.outdata = ctx.createImageData(this.width,this.height);
	},

	make_transform: function() {
		this.used_sliders = {};

		var code = input_code.value;
		var u = this;
		var width = this.width;
		var height = this.height;
		function slider(name,start,end,value,step) {
			return u.slider(name,start,end,value,step);
		}
		used_sliders = {};
		try {
			this.transform = eval('(function(x,y){\n'+code+'\nreturn [sx,sy];})');
		} catch(e) {
			return;
		}
	},

	remove_old_sliders: function() {
		for(var x in this.sliders) {
			if(!(x in this.used_sliders)) {
				this.sliders[x].li.remove();
				delete this.sliders[x];
			}
		}
		this.used_sliders = {};
	},

	draw_point: function(x,y) {
		var precision = Math.floor(Math.max(this.precision,1));

		var width = this.width;
		var height = this.height;

		var indata = this.indata;
		var outdata = this.outdata;

		try {
			var coords = this.transform(x,y);
		} catch(e) {
			coords = [0,0];
		}
		var sx = Math.floor(coords[0]);
		var sy = Math.floor(coords[1]);
		if(sx>=0 && sx<=width && sy>=0 && sy<=height) {
			var sp = (sy*width+sx)*4;
			for(var dx=0;dx<precision;dx++) {
				for(var dy=0;dy<precision;dy++) {
					var op = ((y+dy)*width+(x+dx))*4;
					outdata.data[op] = indata.data[sp];
					outdata.data[op+1] = indata.data[sp+1];
					outdata.data[op+2] = indata.data[sp+2];
					outdata.data[op+3] = indata.data[sp+3];
				}
			}
		}
	},

	draw: function() {
		var t = new Date();
		if(!this.indata) {
			return;
		}
		for(var i=0;i<this.pointsToDraw;i++) {
			var x = Math.floor(Math.random()*this.width);
			var y = Math.floor(Math.random()*this.height);
			this.draw_point(x,y);
		}
		var t2 = new Date();
		var td = t2-t;
		this.pointsToDraw = 40*this.pointsToDraw/td;
		this.draw_out();
	},

	draw_out: function() {
		ctx.putImageData(this.outdata,this.width,0);
	},

	old_draw: function() {
		this.read_image();
		this.make_transform();
		this.draw();
		this.remove_old_sliders();
	}
}

var unfurler = new Unfurler();

window.addEventListener('load',function() {unfurler.old_draw()});

canvas.addEventListener('dragenter',function(e) {
	canvas.classList.add('drag');
	e.stopPropagation();
	e.preventDefault();
},false);
canvas.addEventListener('dragover',function(e) {
	e.stopPropagation();
	e.preventDefault();
},false);
canvas.addEventListener('dragleave',function(e) {
	canvas.classList.remove('drag');
	e.stopPropagation();
	e.preventDefault();
},false);
canvas.addEventListener('drop',function(e) {
	canvas.classList.remove('drag');
	e.stopPropagation();
	e.preventDefault();

	var dt = e.dataTransfer;
	var file = dt.files[0];

	if(!file.type.match(/^image\//)) {
		return;
	}
	source.file = file;

	var reader = new FileReader();
	reader.onload = function(e) {
		source.src = e.target.result;
		unfurler.read_image();
	}
	reader.readAsDataURL(file);
},false);

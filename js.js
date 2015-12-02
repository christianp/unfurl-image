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

var sliders = {};
var used_sliders = {};
function slider(name,start,end,value,step) {
	used_sliders[name] = true;
	if(name in sliders) {
		var d = sliders[name];
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
		return sliders[name].value;
	} else {
		var li = make_element('li',{'class': 'slider'},'<label>'+name+'</label>');
		var range = make_element('input',{'type':'range',min:start,max:end,value:value || ((start+end)/2),step:step || 1});
		var display = make_element('span',{'class':'value'},range.value);
		li.appendChild(range);
		li.appendChild(display);
		document.getElementById('sliders').appendChild(li);
		sliders[name] = {
			value: range.value,
			li: li,
			range: range,
			start: start,
			end: end,
			step: step
		};
		range.addEventListener('input',function() {
			sliders[name].value = range.value;
			display.innerText = sliders[name].value;
			trigger_redraw();
		},false);
		return sliders[name].value;
	}
}

var precision = 1;
function draw() {
	var width = source.clientWidth;
	var height = source.clientHeight;
	canvas.width = width*2;
	canvas.height = height;

	precision = Math.floor(Math.max(precision,1));

	var code = input_code.value;
	used_sliders = {};
	var transform = eval('(function(x,y){\n'+code+'\nreturn [sx,sy];})');

	ctx.drawImage(source,0,0,width,height);
	var data = ctx.getImageData(0,0,width,height);
	var out = ctx.createImageData(width,height);
	for(var x=0;x<width;x += precision) {
		for(var y=0;y<height;y += precision) {
			var coords = transform(x,y);
			var sx = Math.floor(coords[0]);
			var sy = Math.floor(coords[1]);
			if(sx>=0 && sx<=width && sy>=0 && sy<=height) {
				var sp = (sy*width+sx)*4;
				for(var dx=0;dx<precision;dx++) {
					for(var dy=0;dy<precision;dy++) {
						var op = ((y+dy)*width+(x+dx))*4
						out.data[op] = data.data[sp];
						out.data[op+1] = data.data[sp+1];
						out.data[op+2] = data.data[sp+2];
						out.data[op+3] = data.data[sp+3];
					}
				}
			}
		}
	}

	for(var x in sliders) {
		if(!(x in used_sliders)) {
			sliders[x].li.remove();
			delete sliders[x];
		}
	}

	ctx.putImageData(out,600,0);
}

window.addEventListener('load',draw);

var redraw = false;
setInterval(function() {
	if(redraw) {
		precision = 16;
		redraw = false;
		draw();
	} else if(precision>1) {
		precision /= 2;
		draw();
	}
},200);

function trigger_redraw() { 
	redraw = true; 
}

input_code.addEventListener('input', trigger_redraw, false);

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
		trigger_redraw();
	}
	reader.readAsDataURL(file);
},false);

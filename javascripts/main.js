var masterNode;
var doDrawCentreMark = false;

class Leaf{
	constructor(type){
		this.type = type;
	}
	stage(){
		throw new Error('Call to abstract function');
	}
	repaint(){
		throw new Error('Call to abstract function');
	}
	getWidth(ctx){
		throw new Error('Call to abstract function');
	}
	getHeight(ctx){
		throw new Error('Call to abstract function');
	}
}

class TextLeaf extends Leaf{
	constructor(text){
		super('leaf');
		this.text = text;
		// based on tested height of font for now - tricky problem
		this.height = 20;
	}
	getWidth(ctx){
		ctx.font = "20px arial";
		this.width = ctx.measureText(this.text).width;
		return this.width;
	}
	getHeight(ctx){
		return this.height;
	}
	stage(ctx, x, y){
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		this.getWidth(ctx);
	}
	repaint(){
		if(this.ctx == null || this.x == null || this.y == null){
			console.log('Leaf painting error: null context, x, or y');
		}
		this.ctx.font = "20px arial";
		//	ctx.fillStyle="#0000FF";
		this.ctx.fillText(this.text, this.x - this.width/2, this.y);
	}
  getLatex(){
    return this.text;
  }
}

class UnicodeLeaf extends TextLeaf{
  constructor(canvasText, latexCode){
    super(canvasText);
    this.latex = latexCode;
  }
  getLatex(){
    return this.latex;
  }
}

class IncludedUnicodeLeaf extends UnicodeLeaf{
  constructor(key){
    super(getUnicodeChar(key), nameToUnicodeLatexMap.get(key));
  }
}

class VCon extends Leaf{
	constructor(vConType){
		super('vcon');
    this.vConType = vConType;
    this.left = '';
    this.right = '';
	}
  getLatexPrefix(){
    throw new Error('Call to abstract function');
  }
  getLatexLeft(){
    return this.left;
  }
  getLatexRight(){
    return this.right;
  }
}

class HLine extends VCon{
	constructor(lineWidth, lineType){
		super('hline');
		this.lineWidth = lineWidth;
		this.lineType = lineType;

	}
	setLineWidth(lineWidth){
		this.lineWidth = lineWidth;
	}
	setLineType(lineType){
		this.lineType = lineType;
	}
	getWidth(){
    // TODO with left/right vals
		return this.lineWidth;
	}
	getHeight(){
    let height = 0;
    switch(this.lineType){
      case 'single_solid':
      case 'single_dotted':
        height = 1;
        break;
      case 'double_solid':
        height = 5;
        break;
      default:
        throw new Error('Cannot return height - line type not set');
    }
    return height;
		// TODO with var heights - check if heigher than fixed height
	}
	stage(ctx, x, y){
		if(this.lineWidth == null)	throw new Error('Line staged with invalid line width parameter');
		if(this.lineType == null) this.lineType = single_solid;
		this.ctx = ctx;
		this.x = x;
		this.y = y;
	}
	repaint(){
  	this.ctx.strokeStyle = '#000000';
    this.ctx.beginPath();
    switch(this.lineType){
      case 'single_solid':
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y);
        break;
      case 'single_dotted':
        const dashLength = 3;
        for(let x = this.x - this.lineWidth/2; x < this.x + this.lineWidth/2; x += 2 * dashLength){
          this.ctx.moveTo(x, this.y);
          if(x + dashLength > this.x + this.lineWidth/2){
            this.ctx.lineTo(this.x + this.lineWidth/2, this.y);
            break;
          }
          else{
            this.ctx.lineTo(x + dashLength, this.y);
          }
        }
        break;
      case 'double_solid':
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y - 2);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y - 2);
        this.ctx.moveTo(this.x - this.lineWidth/2, this.y + 2);
        this.ctx.lineTo(this.x + this.lineWidth/2, this.y + 2);
        break;
      default:
        throw new Error('Cannot draw line - line type not set');
    }
    this.ctx.stroke();
	}
  getLatexPrefix(){
    switch(this.lineType){
      case 'single_solid':
        return '\\odi';
      case 'double_solid':
        return '\\odI';
      case 'single_dotted':
        return '\\odo';
      default:
        throw new Error('Line type has no associated LaTeX prefix');
    }
  }
}

class defaultHCon extends IncludedUnicodeLeaf{
	constructor(){
		super('log_and');
	}
}

class Node extends Leaf{
	constructor(type){
		super(type);
		this.subs = [];
	}
	addNext(node){
		this.subs.push(node);
	}
	addPrev(node){
		this.subs.unshift(node);
	}
	stage(ctx, x, y){
		console.log('Warning: relying on generic node class function');
		this.subs.forEach(function(item, index, array) {
			item.stage(ctx, x, y);
		});
	}
	repaint(){
		console.log('Warning: relying on generic node class function');
		this.subs.forEach(function(item, index, array) {
			item.repaint();
		});
	}
}

class hjoin extends Node{
	constructor(){
		super('hjoin');
		this.hspace = 5;
		this.connectives = [];
	}
	addLeft(node){
		if(this.subs.length !== 0) this.connectives.unshift(new defaultHCon());
		this.addPrev(node);
	}
	addRight(node){
		if(this.subs.length !== 0) this.connectives.push(new defaultHCon());
		this.addNext(node);
	}
	getHeight(ctx){
		let maxHeight = 0;
		this.subs.forEach(function(item, index, array) {
			if(item.getHeight(ctx) > maxHeight) maxHeight = item.getHeight(ctx);
		});
		return maxHeight;
	}
	getWidth(ctx){
		let totalWidth = 0;
		this.subs.forEach(function(item, index, array) {
			totalWidth += item.getWidth(ctx);
		});
		this.connectives.forEach(function(item, index, array){
			totalWidth += item.getWidth(ctx);
		});
		totalWidth += this.connectives.length * 2 * this.hspace;
		return totalWidth;
	}
	stage(ctx, x, y){
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		let left = x - this.getWidth(ctx)/2;
		for (let item of this.subs) {
			item.stage(ctx, left + item.getWidth(ctx)/2, y);
			left += item.getWidth(ctx);
			left += this.hspace;
			if(this.subs.indexOf(item) < this.subs.length - 1){
				let con = this.connectives[this.subs.indexOf(item)];
				con.stage(ctx, left + con.getWidth(ctx)/2, y);
				left += con.getWidth(ctx);
				left += this.hspace;
			}
		};
	}
	repaint(){
		this.subs.forEach(function(item, index, array) {
			item.repaint();
		});
		for (let item of this.connectives){
			item.repaint();
		}
	}
  getLatex(){
    let result = '';
    for (let item of this.subs){
      result = result + item.getLatex();
      if(this.subs.indexOf(item) < this.subs.length -1){
        result = result + ' ' + this.connectives[this.subs.indexOf(item)].getLatex() + ' ';
      }
    }
    return result;
  }
}

class vjoin extends Node{
	constructor(){
		super('vjoin');
		this.vspace = 2;
		this.vcons = [];
	}
	addAbove(node){
		this.addPrev(node);
	}
	addBelow(node){
		this.addNext(node);
	}
	getHeight(ctx){
		let totalHeight = 0;
		for (let item of this.subs){
			totalHeight += item.getHeight(ctx);
		}
		for (let item of this.vcons){
			totalHeight += item.getHeight(ctx);
			totalHeight += 2 * this.vspace;
		}
		return totalHeight;
	}
	getWidth(ctx){
		let maxWidth = 0;
		this.subs.forEach(function(item, index, array) {
			if(item.getWidth(ctx) > maxWidth) maxWidth = item.getWidth(ctx);
		});
		return maxWidth;
		// TO DO - vertical joins with minimum widths (e.g. subscript letters on side of line)
	}
	stage(ctx, x, y){
		const maxWidth = this.getWidth(ctx);
		this.ctx = ctx;
		this.x = x;
		this.y = y;
		let top = y - this.getHeight(ctx)/2;
		this.vcons = [];
		for (let item of this.subs) {
			item.stage(ctx, x, top + item.getHeight(ctx)/2);
			top += item.getHeight(ctx);
			if(this.subs.indexOf(item) < this.subs.length - 1){
				top += this.vspace;
				this.vcons.push(new HLine(maxWidth, 'single_solid'));
				this.vcons[this.vcons.length - 1].stage(ctx, x, top);
				top += this.vcons[this.vcons.length - 1].getHeight(ctx);
				top += this.vspace;
			}
		};
	}
	repaint(){
		for(let item of this.subs){
			item.repaint();
		}
		for(let item of this.vcons){
			item.repaint();
		}
	}
  getLatex(){
    if(this.subs.length < 1) return '';
    else if(this.subs.length === 1) return '\\od{' + this.subs[0].getLatex() + '}';
    let latex = '\\odh{' + this.subs[0].getLatex() + '}';
    for(let i = 1; i < this.subs.length; i++){
      let con = this.vcons[i-1];
      latex = con.getLatexPrefix() + '{' + latex + '}{' + con.getLatexLeft() + '}{' + this.subs[i].text + '}{' + con.getLatexRight() + '}';
    }
    latex = '\\od{' + latex + '}';
    return latex;
  }
}

function startScript(){
	myCanvas.start();
}

var myCanvas = {
    canvas : document.getElementById("canvas"),
    start : function() {
        this.canvas.width = 480;
        this.canvas.height = 270;
        this.context = this.canvas.getContext("2d");
//		window.addEventListener('keydown', function(e){keyMove(e.keyCode);});
//		this.interval = setInterval(updateCanvas, (1000/30));
    },
	clear : function(){
		this.context.clearRect(0,0, this.canvas.width, this.canvas.height);
	}
}

function repaintAll() {
    myCanvas.clear();
	myCanvas.context.textBaseline = 'middle';
	if(masterNode != null){
		masterNode.stage(myCanvas.context, 240, 135);
		masterNode.repaint();
	}
	if(doDrawCentreMark) drawCentreMark(myCanvas.context);
}

function clearNodes(){
	masterNode = null;
	repaintAll();
}

var dualDemo = {
	start : function() {
		this.n = 1;
		masterNode = new TextLeaf(this.n++);
		repaintAll();
	},
	hNext : function() {
		if (masterNode == null){
			dualDemo.start();
			return;
		}
		if(this.n == undefined) this.n = 1;
		if(masterNode.type === 'hjoin'){
			masterNode.addRight(new TextLeaf(this.n++));
		}
		else{
			const newMaster = new hjoin();
			newMaster.addLeft(masterNode);
			newMaster.addRight(new TextLeaf(this.n++));
			masterNode = newMaster;
		}
		repaintAll();
	},
	vNext : function() {
		if (masterNode == null){
			dualDemo.start();
			return;
		}
		if(this.n == undefined) this.n = 1;
		if(masterNode.type === 'vjoin'){
			masterNode.addBelow(new TextLeaf(this.n++));
		}
		else{
			var newMaster = new vjoin();
			newMaster.addAbove(masterNode);
			newMaster.addBelow(new TextLeaf(this.n++));
			masterNode = newMaster;
		}
		repaintAll();
	}
}

function drawCentreMark(context){
	context.fillStyle="#00FF00";
	context.beginPath();
	context.moveTo(myCanvas.canvas.width/2 - 5, myCanvas.canvas.height/2 - 5);
	context.lineTo(myCanvas.canvas.width/2 + 5, myCanvas.canvas.height/2 + 5);
	context.moveTo(myCanvas.canvas.width/2 + 5, myCanvas.canvas.height/2 - 5);
	context.lineTo(myCanvas.canvas.width/2 - 5, myCanvas.canvas.height/2 + 5);
	context.stroke();
	context.beginPath();
	context.fillStyle="#000000";
}

function toggleCentreMark(){
	doDrawCentreMark = !doDrawCentreMark;
	repaintAll();
}

function toLatex(){
  if(masterNode == null) return '';
  else{
    let test = masterNode.getLatex();
    if(test == undefined) throw new Error('This type is not currently supported');
    else return test;
  }
}

function showLatex(){
  const text = toLatex();
  if(text == null){
		document.getElementById("latexOutput").innerHTML = '';
	}
	else{
		document.getElementById("latexOutput").innerHTML = text;
	}
}

function unicodeToHTML5(unicode){
  // convert Unicode U+ codes to HTML5 &#x representation
  if(unicode.slice(0,1) === 'U+') return null;
  return unicode.replace('U+', '&#x');
}

// Unicode aliases to return codepoints for use in plain HTML5
function getUnicodeHTML(name){
  return '&#x' + nameToUnicodeHexMap.get(name);
}

// Unicode aliases to return codepoints for use in Javascript (i.e. the canvas)
function getUnicodeChar(name){
  return String.fromCharCode(parseInt(nameToUnicodeHexMap.get(name), 16))
}

const nameToUnicodeHexMap = new Map(
	new Array(
		['log_and', '2227'],
		['log_or', '2228'],
		['log_not', '00AC'],
		['psi_lower', '03C8'],
		['right_arrow', '2192'],
		['left_arrow', '2190'],
		['left_right_arrow', '2194']
	)
);

const nameToUnicodeLatexMap = new Map(
	new Array(
		['log_and', '\\vlan'],
		['log_or', '\\vlor'],
		['log_not', '\\vlne'],
		['psi_lower', '\\psi'],
		['right_arrow', '\\vlim'],
		['left_arrow', '\\vlmi'],
		['left_right_arrow', '\\vldi']
	)
);

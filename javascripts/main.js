// debug mode active
const DEBUG = true;
// root node of tree
var masterNode;
// should the centre mark (crosshairs) be drawn?
var doDrawCentreMark = false;
// elements currently selected for editing
var selectedLeaf;
var selectedNode;
//------------------------------------------------
// DEFAULT STYLES/TEXTS
// default text for text leaves - filled star
const DEFAULT_SYMBOL = 'black_star';
// default text for horizontal joins - logical AND
const DEFAULT_HCON = 'log_and';
// colour to hightlight items when clicked
const HIGHLIGHT_COLOUR = "#0000FF";

class Leaf{
	constructor(type){
		this.type = type;
		this.selected = false;
	}
	setSelected(bool){
		// set whether the element is currently selected
		this.selected = bool;
	}
	printCoords(){
		// debug function to print x/y values
		console.log(this.x);
		console.log(this.y);
	}
	printIdentifier(){
		// debug function to print name/helpful info
		if(this.text){
			console.log(this.text + ' clicked');
		}
		else{
			console.log(this.type + ' clicked');
		}
	}
	traceClick(ctx, clickX, clickY){
		// test if node clicked
		if(clickX <= this.x + this.getWidth(ctx)/2 && clickX >= this.x - this.getWidth(ctx)/2 && clickY <= this.y + this.getHeight(ctx)/2 && clickY >= this.y - this.getHeight(ctx)/2){
			// select element and return true
			selectLeaf(this);
			return true;
		}
		return false;
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
		if(this.selected){
			var colour = this.ctx.fillStyle;
			this.ctx.fillStyle = HIGHLIGHT_COLOUR;
		}
		this.ctx.fillText(this.text, this.x - this.width/2, this.y);
		if(this.selected){
			this.ctx.fillStyle = colour;
		}
	}
  getLatex(){
		// If a latex alternative exists, use it, else use text
		if(this.latex){
			return this.latex;
		}
		else{
			return this.text;
		}
  }
}

class UnicodeLeaf extends TextLeaf{
  constructor(canvasText, latexCode){
    super(canvasText);
    this.latex = latexCode;
  }
}

class IncludedUnicodeLeaf extends UnicodeLeaf{
  constructor(key=DEFAULT_SYMBOL){
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
	constructor(lineType){
		super('hline');
		this.lineWidth = 0;
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
		if(this.selected){
			var colour = this.ctx.strokeStyle;
			this.ctx.strokeStyle = HIGHLIGHT_COLOUR;
		}
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
		if(this.selected){
			this.ctx.strokeStyle = colour;
		}
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

class Node extends Leaf{
	constructor(type){
		super(type);
		this.subs = [];
		this.connectives = [];
	}
	addNext(node){
		this.subs.push(node);
	}
	addPrev(node){
		this.subs.unshift(node);
	}
	traceReplace(oldNode, newNode){
		for(let item of this.subs){
			if(item === oldNode){
				this.subs.splice(this.subs.indexOf(oldNode), 1, newNode);
				return;
			}
		}
		for(let item of this.subs){
			if(item.type === 'vjoin' || item.type === 'hjoin'){
				item.traceReplace();
			}
		}
	}
	traceRemove(node){
		for(let item of this.subs){
			if(item === node){
				// unsafe edge cases
				if(!node) return;
				if(this.subs.length === 0) return;
				// find element to remove
				let index = this.subs.indexOf(node);
				// remove element
				this.subs.splice(index, 1);
				// remove connective if necessary - remove from before element unless at front
				if(index === 0 && this.connectives.length !== 0){
					this.connectives.shift();
				}
				else if(index !== 0){
					this.connectives.splice(index - 1, 1);
				}
				if(this.subs.length === 0){
					if(masterNode === this){
						masterNode = new IncludedUnicodeLeaf();
					}
					else{
						masterNode.traceRemove(this);
					}
				}
				return;
			}
		}
		for(let item of this.subs){
			if(item.type === 'vjoin' || item.type === 'hjoin'){
				item.traceRemove(node);
			}
		}
	}
	traceClick(ctx, clickX, clickY){
		// test if node clicked
		if(clickX <= this.x + this.getWidth(ctx)/2 && clickX >= this.x - this.getWidth(ctx)/2 && clickY <= this.y + this.getHeight(ctx)/2 && clickY >= this.y - this.getHeight(ctx)/2){
			// select element then test if sub-elements selected
			selectNode(this);
			if(this.subs){
				for(let item of this.subs) {
					item.traceClick(ctx, clickX, clickY);
				}
			}
			if(this.connectives){
				for(let item of this.connectives){
					item.traceClick(ctx, clickX, clickY);
				}
			}
			return true;
		}
		return false;
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
	// add node left of the given node or at the very left if unspecified
	addLeft(node, ref){
		// if unspecified, add at very left, else find index to insert before
		let index = 0;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective after
		if(this.subs.length !== 0) this.connectives.splice(index, 0, new IncludedUnicodeLeaf(DEFAULT_HCON));
		this.subs.splice(index, 0, node);
	}
	// add node to right of the given node or at the very right if unspecified
	addRight(node, ref){
		// if unspecified, add at very right, else find index to insert after
		let index = this.subs.length - 1;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective before
		if(this.subs.length !== 0) this.connectives.splice(index + 1, 0, new IncludedUnicodeLeaf(DEFAULT_HCON));
		this.subs.splice(index + 1, 0, node);
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
		this.connectives = [];
	}
	// add node above the given node or at the top if unspecified
	addAbove(node, ref){
		// if unspecified, add at top, else find index to insert above
		let index = 0;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective after
		if(this.subs.length !== 0) this.connectives.splice(index, 0, new HLine('single_solid'));
		this.subs.splice(index, 0, node);
	}
	// add node below the given node or at the bottom if unspecified
	addBelow(node, ref){
		// if unspecified, add at bottom, else find index to insert below
		let index = this.subs.length - 1;
		if(ref != null){
			index = this.subs.indexOf(ref);
		}
		// if no other nodes, no connective needed, else add connective before
		if(this.subs.length !== 0) this.connectives.splice(index + 1, 0, new HLine('single_solid'));
		this.subs.splice(index + 1, 0, node);
	}
	getHeight(ctx){
		let totalHeight = 0;
		for (let item of this.subs){
			totalHeight += item.getHeight(ctx);
		}
		for (let item of this.connectives){
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
		for (let item of this.subs) {
			item.stage(ctx, x, top + item.getHeight(ctx)/2);
			top += item.getHeight(ctx);
			top += this.vspace;
			if(this.subs.indexOf(item) < this.subs.length - 1){
				let con = this.connectives[this.subs.indexOf(item)];
				con.setLineWidth(maxWidth);
				con.stage(ctx, x, top);
				top += con.getHeight(ctx);
				top += this.vspace;
			}
		};
	}
	repaint(){
		for(let item of this.subs){
			item.repaint();
		}
		for(let item of this.connectives){
			item.repaint();
		}
	}
  getLatex(){
    if(this.subs.length < 1) return '';
    else if(this.subs.length === 1) return '\\od{' + this.subs[0].getLatex() + '}';
    let latex = '\\odh{' + this.subs[0].getLatex() + '}';
    for(let i = 1; i < this.subs.length; i++){
      let con = this.connectives[i-1];
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
		this.context = this.canvas.getContext("2d");
		window.addEventListener('resize', myCanvas.resize);
		this.resize();
		this.reset();
  },
	reset : function(){
		masterNode = new IncludedUnicodeLeaf();
		repaintAll();
	},
	clear : function(){
		this.context.clearRect(0,0, this.canvas.width, this.canvas.height);
	},
	resize : function(){
		let newWidth = Math.max(window.innerWidth, 500);
		//let newHeight = window.innerHeight;
		let newHeight = Math.max(0, 300);
		this.canvas.width = newWidth;
		this.canvas.height = newHeight;
		repaintAll();
	},
	traceClick : function(event){
		// convert from page coordinates to canvas coordinates
		const x = event.pageX - this.canvas.offsetLeft;
		const y = event.pageY - this.canvas.offsetTop;
		// clear selected leaf/node
		unselectAll();
		if(masterNode) masterNode.traceClick(this.context, x, y);
		repaintAll();
	}
}

function unselectAll(){
	unselectLeaf();
	unselectNode();
}

function selectLeaf(item){
	unselectLeaf();
	selectedLeaf = item;
	item.setSelected(true);
	if(selectedLeaf.text){
		let textBox = document.getElementById('textBox');
		if(selectedLeaf.text === getUnicodeChar(DEFAULT_SYMBOL)){
			textBox.value = '';
		}
		else{
			textBox.value = selectedLeaf.text;
		}
		textBox.disabled = false;
		// set focus to text box for quick editing
		textBox.focus();
	}
}

function unselectLeaf(){
	// if 'selected' is non-null, unselect
	if(selectedLeaf){
		selectedLeaf.setSelected(false);
		let textBox = document.getElementById('textBox');
		textBox.disabled = true;
		textBox.value = '';
	}
	selectedLeaf = null;
}

function selectNode(item){
	unselectNode();
	selectedNode = item;
	item.setSelected(true);
}

function unselectNode(){
	// if 'selected' is non-null, unselect
	if(selectedNode){
		selectedNode.setSelected(false);
	}
	selectedNode = null;
}

function printSelected(){
	console.log(selectedLeaf);
	console.log(selectedNode);
}

function repaintAll() {
    myCanvas.clear();
	myCanvas.context.textBaseline = 'middle';
	if(masterNode != null){
		masterNode.stage(myCanvas.context, myCanvas.canvas.width/2, myCanvas.canvas.height/2);
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
		unselectAll();
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
		unselectAll();
		repaintAll();
	}
}

var leafActions = {
	textBoxInput : function(textBox){
		// if currently selected element is text, update
		if(selectedLeaf.text){
			if(textBox.value){
				selectedLeaf.text = textBox.value;
				selectedLeaf.latex = '';
			}
			else{
				selectedLeaf.text = getUnicodeChar(DEFAULT_SYMBOL);
				selectedLeaf.latex = nameToUnicodeLatexMap.get(DEFAULT_SYMBOL);
			}
		}
		repaintAll();
	},
	delete : function(){
		masterNode.traceRemove(selectedLeaf);
		unselectAll();
		repaintAll();
	},
	addAbove : function(){
		// if no selected leaf, return
		if(!selectedLeaf){
			alert('Select a leaf before trying to add an element above it');
			return;
		}
		// If leaf selected but no node, node must be master node
		if(!selectedNode){
			masterNode = new vjoin();
			masterNode.addAbove(new IncludedUnicodeLeaf());
			masterNode.addBelow(selectedLeaf);
		}
		// if within a vjoin, find index and add above
		else if(selectedNode.type === 'vjoin'){
			selectedNode.addAbove(new IncludedUnicodeLeaf(), selectedLeaf);
		}
		// if within a hjoin, insert new vjoin within it preserving existing leaf
		else if(selectedNode.type === 'hjoin'){
			let newNode = new vjoin();
			newNode.addAbove(new IncludedUnicodeLeaf());
			newNode.addBelow(selectedLeaf);
			selectedNode.traceReplace(selectedLeaf, newNode);
		}
		else{
			alert('Not yet fully implemented');
		}
		unselectAll();
		repaintAll();
	},
	addBelow : function(){
		// if no selected leaf, return
		if(!selectedLeaf){
			alert('Select a leaf before trying to add an element below it');
			return;
		}
		// If leaf selected but no node, node must be master node
		if(!selectedNode){
			masterNode = new vjoin();
			masterNode.addBelow(new IncludedUnicodeLeaf());
			masterNode.addAbove(selectedLeaf);
		}
		// if within a vjoin, find index and add above
		else if(selectedNode.type === 'vjoin'){
			selectedNode.addBelow(new IncludedUnicodeLeaf(), selectedLeaf);
		}
		// if within a hjoin, insert new vjoin within it preserving existing leaf
		else if(selectedNode.type === 'hjoin'){
			let newNode = new vjoin();
			newNode.addBelow(new IncludedUnicodeLeaf());
			newNode.addAbove(selectedLeaf);
			selectedNode.traceReplace(selectedLeaf, newNode);
		}
		else{
			alert('Not yet fully implemented');
		}
		unselectAll();
		repaintAll();
	},
	addLeft : function(){
		// if no selected leaf, return
		if(!selectedLeaf){
			alert('Select a leaf before trying to add an element left of it');
			return;
		}
		// If leaf selected but no node, node must be master node
		if(!selectedNode){
			masterNode = new hjoin();
			masterNode.addLeft(new IncludedUnicodeLeaf());
			masterNode.addRight(selectedLeaf);
		}
		// if within a hjoin, find index and add to left
		else if(selectedNode.type === 'hjoin'){
			selectedNode.addLeft(new IncludedUnicodeLeaf(), selectedLeaf);
		}
		// if within a vjoin, insert new hjoin within it preserving existing leaf
		else if(selectedNode.type === 'vjoin'){
			let newNode = new hjoin();
			newNode.addLeft(new IncludedUnicodeLeaf());
			newNode.addRight(selectedLeaf);
			selectedNode.traceReplace(selectedLeaf, newNode);
		}
		else{
			alert('Not yet fully implemented');
		}
		unselectAll();
		repaintAll();
	},
	addRight : function(){
		// if no selected leaf, return
		if(!selectedLeaf){
			alert('Select a leaf before trying to add an element right of it');
			return;
		}
		// If leaf selected but no node, node must be master node
		if(!selectedNode){
			masterNode = new hjoin();
			masterNode.addRight(new IncludedUnicodeLeaf());
			masterNode.addLeft(selectedLeaf);
		}
		// if within a hjoin, find index and add to right
		else if(selectedNode.type === 'hjoin'){
			selectedNode.addRight(new IncludedUnicodeLeaf(), selectedLeaf);
		}
		// if within a vjoin, insert new hjoin within it preserving existing leaf
		else if(selectedNode.type === 'vjoin'){
			let newNode = new hjoin();
			newNode.addRight(new IncludedUnicodeLeaf());
			newNode.addLeft(selectedLeaf);
			selectedNode.traceReplace(selectedLeaf, newNode);
		}
		else{
			alert('Not yet fully implemented');
		}
		unselectAll();
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
	if(text){
		window.prompt('Copy the LaTeX markup below and paste it into your LaTeX editor.\nMake sure to include the Virginia Lake package.', text);
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
		['left_right_arrow', '2194'],
		['black_star', '2605']
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
		['left_right_arrow', '\\vldi'],
		['black_star', '\\bigstar']
	)
);

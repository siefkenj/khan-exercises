"use strict";

/* some helpful functional programming tools */
// jQuery's map function has some annoying behavior.
// i.e., if you return an array, it extends the result instead
// of pushing the new array onto the result.  Not good when
// you have to traverse a bunch of 2d arrays! 
var map = function (a, f) {
	var ret = [];
	for (var i = 0; i < a.length; i++) {
		ret.push( f(a[i]) );
	}
	return ret;
};
var zip = function (a,b) {
	var ret = [];
	var l = Math.min(a.length, b.length);
	for (var i = 0; i < l; i++) {
		ret.push([ a[i], b[i] ]);
	}
	return ret;
};
var sum = function (a) {
	var ret = 0;
	for (var i = 0; i < a.length; i++) {
		ret += a[i];
	}
	return ret;
};
var prod = function (a) {
	var ret = 1;
	for (var i = 0; i < a.length; i++) {
		ret *= a[i];
	}
	return ret;
};


/* copy an array two levels deep */
var deepCopyArray = function (a){
	//slice returns a copy of the array
	return map(a, function(x){ 
		return x.slice(); 
	});
};


/* abstract baseclass for symbolic matrices.
 * this shouldn't be used directly */
var AbstractMatrx = function(){};
jQuery.extend(AbstractMatrx.prototype, {
		//initialize our array data
		init : function (m) {
			//if we have an array attr, we assume we're an array
			if (!m.array) {
				this.array = deepCopyArray(m);
			} else {
				this.array = deepCopyArray(m.array);
			}
			this.dims = [this.array.length, this.array[0].length];
		},
		
		//return a copy-and-pasteable 2d array
		toString : function () { 
			var row_texts = [];
			for(var row = 0; row < this.array.length; row++){
				row_texts.push("[" + this.array[row].join(", ") + "]");
			}
			return "["+row_texts.join(", ")+"]";
		},

		//outputs the matrix as latex code 
		//braces can be '[', '(', '|', ''.  
		//defaults to '['.
		toCode : function (braces) {
			return KhanUtil.formatMatrix(this, braces);
		},

		//sums a vector (1-d array)
		//pass in _this_ as the first arg.  For some reason
		//_this_ doesn't make it to this context (at least when we use a map)...
		_sum : function (self, vec) {
			var ret = vec[0];
			for (var i = 1; i < vec.length; i++) {
				ret = self._math.add(ret, vec[i]);
			}
			return ret;
		},
		
		//multiplies all entries in a vector (1-d array)
		_prod : function (self, vec) {
			var ret = vec[0];
			for (var i = 1; i < vec.length; i++) {
				ret = self._math.mul(ret, vec[i]);
			}
			return ret;
		},

		//compute the dot product of two 1-d arrays
		_vecDotProduct : function (a, b) {
			if(a.length != b.length){ throw "Size of dot products do not match!"; }
			var self = this;
			var componantwise_product = map(zip(a,b), function (x) { return self._prod(self, x); });
			return this._sum(self, componantwise_product);
		},
		
		//compute the dot product of two 1-d arrays
		_vecAdd : function (a, b) {
			if(a.length != b.length){ throw "Size of dot products do not match!"; }
			var self = this;
			return map(zip(a,b), function (x) { return self._sum(self, x); });
		},

		//return a new matrix with func applied to each element
		map : function (func) {
			var new_array = map(this.array, function(x){
				return map(x, func);
			});
			return new this.constructor(new_array);
		},
		
		//other can be another matrix or a number
		//returns the result of addition
		add : function (other) {
			var self = this;
			//if we are another matrix
			if (other instanceof this.constructor) {
				if (this.dims[0] != other.dims[0] || this.dims[1] != other.dims[1]) {
					throw "Cannot add a matrix of size "+this.dims+" and "+other.dims+".";
				}
				var new_array =  map( zip(this.array, other.array), 
					function(a){ return self._vecAdd(a[0], a[1]) } );
				
				return new this.constructor(new_array);
			} else {
				var add_n = function (x) { return self._math.add(other, x); };
				return this.map(add_n);
			}
		},
		
		//other can be another matrix or a number
		//returns the result of multiplication
		mul : function (other) {
			var self = this;
			//if we are another matrix
			if (other instanceof this.constructor) {
				if(this.dims[1] != other.dims[0]){ throw "Cannot multiply matrices of size "+this.dims+" by "+other.dims+"."; }
				var new_array =  [];
				var rows = this.array, cols = other.transpose().array;
				for(var i = 0; i < rows.length; i++){
					var dot_with_ith_row = function(x){ return self._vecDotProduct(rows[i], x); };
					//append a new row vector consisting of each column of other dotted with the ith row of this
					new_array.push(map(cols, dot_with_ith_row));
				}
				return new this.constructor(new_array)
			} else {
				var mul_n = function (x) { return self._math.mul(other, x); };
				return this.map(mul_n);
			}
		},

		//returns the i,j element.  If i=':' or j=':',
		//it returns the whole row or column
		get : function (i,j) {
			if(i == ':' && j == ':'){ return new this.constructor(this.array); }
			if(j == ':'){
				//return a copy of the row
				return this.array[i].slice();
			}
			if(i == ':'){
				return map(this.array, function(row){ return row[j]; });
			}
			return this.array[i][j]
		},

		// return the diagonal entries 
		diag : function(){
			var max_entry = Math.min(this.dims[0], this.dims[1]);
			var ret = [];
			for(var i = 0; i < max_entry; i++){
				ret.push(this.array[i][i]);
			}
			return ret;
		},

		is_square : function(){
			return (this.dims[0] == this.dims[1]);
		},

		//return a transposed version of ourselves
		transpose : function(){
			var new_array = [];
			//loop through the columns of this.array
			for(var i = 0; i < this.dims[1]; i++){
				var return_ith_componant = function(x){ return x[i]; };
				//append the array consisting of the ith column of this.array
				new_array.push(map(this.array, return_ith_componant));
			}
			return new this.constructor(new_array);
		}

		// elementary row operations 
		/* TODO
		this.row_op_multiply_row_by_const = function(val, row){
			if( row >= this.dims[0] ){ throw "Row "+row+" out of range for matrix of size "+this.dims+"."; }
			var new_array = deepCopyArray(this.array);
			new_array[row] = map(new_array[row], function(x){ return x*val; });
			return new Matrix(new_array);
		}
		this.row_op_add_mul_of_one_row_to_another = function(x,n,m){
			if( n >= this.dims[0] || m >= this.dims[0]){ throw "Rows "+[m,n]+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			for(var i = 0; i < ret.array[m].length; i++){
				ret.array[m][i] += x*ret.array[n][i];
			}
			return ret;
		}
		this.swap_two_rows = function(row1, row2){
			if( row1 >= this.dims[0] || row2 >= this.dims[0]){ throw "Rows "+[row1,row2]+" out of range for matrix of size "+this.dims+"."; }
			var ret = new Matrix(this.array);
			var tmp = ret.array[row1];
			ret.array[row1] = ret.array[row2];
			ret.array[row2] = tmp;
			return ret;
		}
		*/
	
});

// set up the matrix class
KhanUtil.Matrix = function(m){ 
	//make sure that when we are constructed, our inheritence is also carried over
	this.constructor = KhanUtil.Matrix; 
	//initialize
	this.init(m); 
};
KhanUtil.Matrix.prototype = jQuery.extend( new AbstractMatrx(), {
	//numbers smaller than ZERO_TOLERANCE in magnitude are treated as zero
	ZERO_TOLERANCE : 0.0000001,

	//math functions that are used when manipulating entries
	//these are abstraced so SymbolicMatrix and Matrix can use the same
	//matrix multiplication and matrix addition functions
	_math : {
		add : function (a,b) {
			return a+b;
		},
		mul : function (a,b) {
			return a*b;
		}
	},

	//return the determinant
	det : function(){
		if (!this.is_square()) {
			return 0;
		}
		//reduce the matrix to upper triangular while keeping track of row swaps
		var reduced = this._reduce_to_stage('ref');
		var diag = reduced['matrix'].diag();
		var det = Math.pow(-1, reduced['row_swaps'])*prod(diag);
		
		//if the matrix was an integer matrix, make sure
		//we return an integer
		var is_int = function(x){ return Math.round(x) == x; };
		//if any number isn't an int, this product will be zero
		var all_ints = prod(map(this.array, function(x){
			return prod(map(x, is_int));
		}));
		if (all_ints) {
			return Math.round(det);
		}
		return det;
	},

	//return the matrix in row-echelon form
	ref : function(){
		return this._reduce_to_stage('ref')['matrix'];
	},

	//return the matrix in reduced row-echelon form
	rref : function(){
		return this._reduce_to_stage('rref')['matrix'];
	},

	// row-reduce a matrix to stage ref, pre-rref, or rref 
	_reduce_to_stage : function (stage) {
		var self = this;
		// componant-wise subtraction of v1-m*v2 of two row vectors
		var substractMultipleOfVecs = function (v1, v2, m) {
			var ret = v1.slice(); 	//make a copy of v1
			var i;
			for (i in v2) {
				ret[i] -= m*v2[i];
			}
			return ret;
		};
		/* pass in a 2d array and it returns the first
		 * non-zero entry in column col in a 
		 * row >= min_row.  If there are none, it returns
		 * null.
		 */
		var findNonzeroEntry = function (array, col, min_row) {
			for (var i = min_row; i < array.length; i++) {
				if (Math.abs(array[i][col]) > self.ZERO_TOLERANCE) {
					return i;
				}
			}
			return null;
		};
		// uses the pivot in position row,col to zero all entries below 
		var zeroBelow = function (array, row, col) {
			for (var i = row + 1; i < array.length; i++) {
				array[i] = substractMultipleOfVecs(array[i], array[row], array[i][col]/array[row][col]);
			}
		};
		var zeroAbove = function (array, row, col) {
			for (var i = row - 1; i >= 0; i--) {
				array[i] = substractMultipleOfVecs(array[i], array[row], array[i][col]/array[row][col]);
			}
		};
		var swapRows = function (array, row1, row2) {
			var tmp = array[row1];
			array[row1] = array[row2];
			array[row2] = tmp;
		}

		// do the actual row reduction 
		var new_array = deepCopyArray(this.array);
		var pivot_row = 0, pivot_pos = [], num_row_swaps = 0;
		for (var pivot_col = 0; pivot_col < new_array[0].length; pivot_col++) {
			var non_zero_row = findNonzeroEntry(new_array, pivot_col, pivot_row);
			if ( non_zero_row != null ) {
				//move a row with non-zero leading entry into the pivot position
				if ( pivot_row != non_zero_row ) {
					swapRows(new_array, pivot_row, non_zero_row);
					num_row_swaps += 1;
				}
				zeroBelow(new_array, pivot_row, pivot_col);
				pivot_pos.push({'row':pivot_row, 'col':pivot_col});  //if we used this as a pivot, add it to the list
				pivot_row += 1;
			}
		}
		//if we only want row-echelon form, we've already got it!
		if ( stage == 'ref' ) {
			return {'matrix': new KhanUtil.Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};
		}

		// continue reducing until we get to pre-rref 
		//since we already know exactly where our pivots are, this is really easy
		map(pivot_pos, function(pos){ zeroAbove(new_array, pos['row'], pos['col']); });
		if ( stage == 'pre-ref') {
			return {'matrix': new KhanUtil.Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};
		}

		// continue to full rref 
		//once again, we know what our pivot rows are, so this is really easy
		map(pivot_pos, function (pos) { 
			var pivot_val = new_array[pos['row']][pos['col']];
			new_array[pos['row']] = map(new_array[pos['row']], function(x){ return x/pivot_val; });
		});
		return {'matrix': new KhanUtil.Matrix(new_array), 'row_swaps': num_row_swaps, 'pivot_col': pivot_pos};
	}
});

// set up the SymbolicMatrix class
// A SymbolicMatrix keeps all entries as strings
// and applies operations symbolically.  e.g.,
// [[1]]+[[2]] = [['1+2']] */
KhanUtil.SymbolicMatrix = function(m){ 
	//make sure that when we are constructed, our inheritence is also carried over
	this.constructor = KhanUtil.SymbolicMatrix; 
	//initialize
	this.init(m); 
};
KhanUtil.SymbolicMatrix.prototype = jQuery.extend( new AbstractMatrx(), {
	//math functions that are used when manipulating entries
	//these are abstraced so SymbolicMatrix and Matrix can use the same
	//matrix multiplication and matrix addition functions
	_math : {
		add : function (a,b) {
			return [a,b].join('+');
		},
		mul : function (a,b) {
			return [a,b].join('*');
		}
	}
});

jQuery.extend(KhanUtil, {
	/* Returns a SymbolicMatrix version of mat with latex color
	 * formatting applied.  row,col use slicing notation.
	 * i.e., row=':' will color that entire row and col=':'
	 * will color the entire column.  if row,col=':',':'
	 * the whole matrix will be colored */
	colorizeMatrix : function(mat, color, row, col){
		var SymbolicMatrix = KhanUtil.SymbolicMatrix;
		/* set row, col to the defualt values if they're undefined */
		if(typeof row === 'undefined'){ row = ':'; }
		if(typeof col === 'undefined'){ col = ':'; }

		/* wraps whatever value we pass in in a color tag */
		var apply_color = function(x){
			return '\\color{'+color+'}{'+x+'}';
		}

		var new_array = deepCopyArray(mat.array);
		if(row == ':' && col == ':'){
			new_array = map(new_array, function(x){
				return map(x, apply_color);
			});
		}else if(row == ':' && col != ':'){
			var apply_color_to_col = function(x){ 
				x[col] = apply_color(x[col]);
				return x;
			};
			new_array = map(new_array, apply_color_to_col);
		}else if(row != ':' && col == ':'){
			new_array[row] = map(new_array[row], apply_color);
		}else{ //no slicing, just change the single entry
			new_array[row][col] = apply_color(new_array[row][col]);
		}
		
		return new SymbolicMatrix(new_array);
	},
	
	/* color a matrix's entries a specific color one by one.
	 * i.e., mat[0][0] is colored color_list[0],
	 * mat[0][1] is colored color_list[1], etc.
	 */
	colorizeMatrixAs : function(mat, color_list){
		var SymbolicMatrix = KhanUtil.SymbolicMatrix;

		var new_array = deepCopyArray(mat.array);
		var num_rows = mat.dims[0], num_cols = mat.dims[1];
		for(var i = 0; i < color_list.length && i < num_rows*num_cols; i++){
			var col = i % num_cols;
			var row = (i - col) / num_cols;
			new_array[row][col] = '\\color{'+color_list[i]+'}{'+new_array[row][col]+'}';
		}
		
		return new SymbolicMatrix(new_array);
	},

	/* matrix to latex conversion. 
	 * braces is in ['[', '(', '|', ''].  Defaults to '['
	 */
	formatMatrix : function(mat, braces){
		var array = mat.array;
		var latex_brace = 'bmatrix';
		if(braces == '('){ latex_brace = 'pmatrix'; }
		if(braces == '|'){ latex_brace = 'vmatrix'; }
		if(braces == ''){ latex_brace = 'matrix'; }

		var transformed_rows = map(array, function(x){ return x.join(' & '); });
		return '\\begin{'+latex_brace+'}'+transformed_rows.join('\\\\')+'\\end{'+latex_brace+'}'

	},

	/* returns a rows x cols matrix with random values between range_low and range_hight */
	randRangeMatrix : function (rows, cols, range_low, range_high) {
		var new_array = [];
		for(var i = 0; i < rows; i++){
			var new_row = [];
			for(var j = 0; j < cols; j++){
				new_row.push(KhanUtil.randRange(range_low, range_high));
			}
			new_array.push(new_row);
		}
		return new KhanUtil.Matrix(new_array);

	},

	// shouldn't be here, but atm, doesn't seem to exist anywhere else 
	/* returns the contents of expr removing any \color{...}{ } tag */
	stripColorMarkup : function (expr) {
		var text = expr;
		var match = expr.toString().match(/\\color{\w+?}{(.*)}/);
		if (match) {
			text = match[1];
		}
		return text;
	},

	/* if you pass in a negative number, it will be returned with parentheses */
	negParens : function (expr) {
		var num = KhanUtil.stripColorMarkup(expr);
		if (num.toString().charAt(0) == '-') {
			return '('+expr+')';
		}
		return expr;
	}

});

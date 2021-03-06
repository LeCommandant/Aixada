(function( $ ){

	
  	var methods = {
  			
     	init : function( options ) {
  		
	  		var settings = {
	  				loadCartURL		: 'php/ctrl/ShopAndOrder.php',
	  				saveCartURL		: 'php/ctrl/ShopAndOrder.php',
	  				autoSave		: 0,						//0 means never. Value should be above 3000 miliseconds, like min. time to add stuff and move away. 
	  	  			date			: 0, 
	  	  			preOrder		: false,
	  	  			unsavedItems	: false,
	  	  			isLoading		: false,
	  	  			saveOnDelete	: true, 					//if items get deleted, the cart is automatically saved
	  	  			cartType		: 'simple',
	  	  			ajaxType		: 'POST',
	  	  			btnType			: 'submit',
	  	  			decimalsQu		: 2,
	  	  			decimalsPrice	: 2,
	  	  			beforeSubmit 	: function(){},
	  	  			submitSuccess 	: function(){},
	  	  			submitError		: function(msg){},
	  	  			submitComplete	: function(){},
	  	  			loadSuccess		: function(){},
	  	  			countItems		: function(){}
	  		};

  			return this.each(function(){
				
  				var $this = $(this); 
  				
  				if ( options ) { 
					$.extend( settings, options );
				}

  				data = $this.data('aixadacart');
  			   
				// If the plugin hasn't been initialized yet
				if ( ! data ) {		
					$(this).data('aixadacart', {
						loadCartURL			: settings.loadCartURL,
						saveCartURL 		: settings.saveCartURL,
						autoSave			: settings.autoSave,
						date				: settings.date,
						preOrder			: settings.preOrder,
						unsavedItems		: settings.unsavedItems,
						isLoading			: settings.isLoading,
						saveOnDelete		: settings.saveOnDelete, 
						cartType			: settings.cartType,
						ajaxType			: settings.ajaxType,
						btnType				: settings.btnType,
						decimalsQu			: settings.decimalsQu,
						decimalsPrice		: settings.decimalsPrice,
						beforeSubmit		: settings.beforeSubmit,
						submitSuccess		: settings.submitSuccess,
						submitError 		: settings.submitError,
						submitComplete		: settings.submitComplete,
						loadSuccess			: settings.loadSuccess,
						countItems			: settings.countImtes
						
					});
				}//end if
  				
  				//init a dialog layer to display messages
				//constructDialog.call($this);
  				
				//construct the cart: append the str to the DOM
  				constructCart.call($this,$this.data('aixadacart').cartType);  				
  				  				
  				//if we have a preorder, we use tabs	
				//if ($this.data('aixadacart').cartType == 'standalone_preorder') $('#cart_tabs').tabs();
				
				//init the submit button; choose "validate" or "save" icon depending on where we are
				if ($this.data('aixadacart').btnType == 'validate'){
					$('#btn_submit').button({
						disabled:true,
						icons : {
							secondary: "ui-icon-check"
						},
						label: $.aixadacart.validate
					}); 
				} else if ($this.data('aixadacart').btnType == 'save') {
					$('#btn_submit').button({
						disabled:true,
						icons : {
							secondary: "ui-icon-disk"
						},
						label: $.aixadacart.save
					}); 
				} else if ($this.data('aixadacart').btnType == 'hidden'){
					$('#btn_submit').button().hide();
				} else {
					$('#btn_submit').button({
						disabled:true,
						label: $.aixadacart.submit
					}); 
				}
				
				//check if autoSave has not a nonsense value. Should be at least 3 seconds
				if ($this.data('aixadacart').autoSave>0 && $this.data('aixadacart').autoSave<3000){
						alert("Autosave value must be bigger than 3000 milliseconds!!");
						$this.data('aixadacart').autoSave = 3000;
				}
				
  				//detect the submit
  				$('form',this).submit(function(){
  				
  						$this.data('aixadacart').beforeSubmit.call($this); 
  						hideCartTips.call($this);
  						
  						$('#btn_submit').button({
  								label: $.aixadacart.saving,
  								disabled:true});
  						
  						var btn_label = ($this.data('aixadacart').btnType == 'validate')? $.aixadacart.validate:$.aixadacart.save;
  						
  						var dataSerial = $(this).serialize();
  						$.ajax({
  							   type: $this.data('aixadacart').ajaxType,
  							   url: $this.data('aixadacart').saveCartURL,
  							   data: dataSerial,
  							   beforeSend : function(){
  							 		$('#cart .cartLoadAnim').show();
  								},
  							   success: function(msg){
  									$this.data('aixadacart').submitSuccess.call($this);
  									$this.data('aixadacart').unsavedItems = false;
  									updateCartTips.call($this,'success',$.aixadacart.msg.saveSuccess,2000);
  									
  									//if we save, then activate the button right away; for validate we have empty cart, button stays deactivated
  									var keep_disabled = ($this.data('aixadacart').btnType == 'validate')? true:false;
  										$('#btn_submit').button({
							    				label: btn_label,
							    				disabled: keep_disabled});	
  									
  							    },
  							   error : function(XMLHttpRequest, textStatus, errorThrown){
  							    	$this.data('aixadacart').submitError.call($this,textStatus);
  							    	updateCartTips.call($this,'error',XMLHttpRequest.responseText);
  							    	//upon saving/validating error, try again :)
  							    	$('#btn_submit').button({
						    				label: btn_label,
						    				disabled:false})
  							    },
  							   complete : function(msg){
  							    	$('#cart .cartLoadAnim').hide();
  							    	
  	
  							    	$this.data('aixadacart').submitComplete.call($this);
  							    }
  						}); //end ajax
  						return false; 
  				});//end submit
				
  				//sets in motion the autosave interval. 
  				if ($this.data('aixadacart').autoSave > 0){
  					setInterval(function() {
  								if ($this.data('aixadacart').unsavedItems && $this.data('aixadacart').isLoading == false){
  									$('#cart').submit();
  								}
  							}, $this.data('aixadacart').autoSave );
  				}
			
       }); //end for each
     }, //end init
     
     /**
      * adds an item to the cart. triggers the recalc of the total cost. If the item already exists
      * updates the quantity of the item. 
      */
     addItem : function(itemObj) {
			
			return this.each(function(){
				
				var $this = null;
				if (itemObj.isPreorder == "true" || itemObj.isPreorder == 1 ){
					$this = $('#aixada_cart_list_preorder');
				} else {
					$this = $('#aixada_cart_list');
				}

				//we have unsaved items	
				$(this).data('aixadacart').unsavedItems = true; 

				//check if input field with given id exists, this means item is already in cart
				var exists = $('#cart_quantity_'+itemObj.id, $this).val(); 
				
				//if it is not, create a new row
				if (!exists){
					
					itemObj.quantity = formatNumInput(itemObj.quantity);
					
					//add it as row
					var str = '<tr id="'+itemObj.id+'">'; 
					str += '<td><a href="" id="del_'+itemObj.id+'" class="deleteStuff" data-icon="delete" data-iconpos="notext">Delete</a></td>';
					str += '<td class="item_name">'+itemObj.name+'</td>';
					str += '<td class="item_provider_name">'+itemObj.provider_name+'</td>';
					str += '<td class="item_quantity">	 <input name="quantity[]" value="'+itemObj.quantity+'" id="cart_quantity_'+itemObj.id+'" size="4" />'; 
					str += 							 	'<input type="hidden" name="preorder[]" value="'+itemObj.isPreorder+'" id="preorder_'+itemObj.id+'" />';
					str += 							 	'<input type="hidden" name="price[]" value="'+itemObj.price+'" id="cart_price_'+itemObj.id+'" />';
					str += 								'<input type="hidden" name="product_id[]" value="'+itemObj.id+'" />';
					str += 								'<input type="hidden" name="rev_tax_percent[]" value="'+itemObj.rev_tax_percent+'" id="cart_rev_tax_percent_'+itemObj.id+'" /></td>';
					str += '<td>' + itemObj.unit + '</td>';
					str += '<td class="item_total" id="item_total_'+itemObj.id+'"></td>';
					str += '</tr>';
					
					$this.prepend(str);

					//event listener to remove items from cart
					$("#del_"+itemObj.id, $this)
						.bind("mouseenter", function(){
								$(this).removeClass('ui-icon-close').addClass('ui-icon-circle-close');
						})
						.bind("mouseleave", function(){
							$(this).removeClass('ui-icon-circle-close').addClass('ui-icon-close');
						})
						.bind("click", function(e){
							$(this).parents('tr').find('input').val(0).trigger('change').end().remove();
							$this.aixadacart("saveCart");	

					});
			
					
					//event listener to detect quantity changes in cart
					$("#cart_quantity_"+itemObj.id, $this).bind("change", function(e){
						//retrieve all the info of the current cart item
						var objItem = $this.aixadacart("getRowData", {
			  												type : 'table',
			  												row :  $(this).parents("tr")
			  			});
						
						//update the row / calculate the price
						updateRow.call($(this),objItem);
						
						//update the row in the actual product list
						//TODO pass the name of the field as options when init cart!
						$('#quantity_'+objItem.id).val(objItem.quantity); //.addClass('ui-state-highlight');
						
						//recalculate total cost
						calculateTotal.call();
						
					});//end event listener
				
				//if item exists, update the quanity field	
				} else {
					
					$('#cart_quantity_'+itemObj.id, $this).val(itemObj.quantity); 
					
				} //end if exists
				
				
				
				//calculate and set cost of item
				updateRow.call($this, itemObj);
				calculateTotal.call();
				
				//make sure the submit button is active
				$('#btn_submit').button( "option", "disabled", false );
			
			}); //end each 
     }, //end addItem 
     
     
     /**
      * sets the options for the cart 
      */
     options : function (options){
    	 return this.each(function(){
    		 data = $(this).data('aixadacart');
    		 
    		 //if the new date is different from the current one, emtpy the cart!
    		 if (data.date != options.date) {
    			 $(this).aixadacart("setDate",options.date);
    		 }
    		 
    		 
    		 if (options) { 
    			$.extend(data, options );
    		 }
    			
    	 });//end each
     },
     
     
     /**
	   * sets the date for the shopping cart. A hidden input field will pass the date
	   * to the server as part of the form data. 
	   */
	  setDate : function(date){
		  return this.each(function(){
			  
			  //save it with the plugin
			  $(this).data('aixadacart').date = date; 
			  
			  //update the hidden input date field of the cart
			  $('#cart_date',$(this)).val(date);
			 
			  //remove all items
			  $(this).aixadacart("removeAll");
			  
		  });
	  }, //end set date
     
	  
     /**
      * loads all order items for a given date. 
      */
	 loadCart : function (options){
    	 
    	 return this.each(function(){
    		 
    		 var $this = $(this);
    		 
    		 if (options.saveCartURL) {
    			 $("#cart_dialog").html('Should not change the save cart URL while loading!').dialog('option','title','Warning').dialog("open");
    		 }
    			 
    		 $this.aixadacart("options",options);
    		 
    		 $this.data('aixadacart').isLoading = true;
    		 $('#cart .cartLoadAnim').show();
    		 
    		 $.ajax({ 
    			type:"GET", 
 				url: $this.data('aixadacart').loadCartURL,
 				dataType: "xml",
 				success: function(xml){
    			 	
    			 	$(xml).find('row').each(function(){
			  			var objItem = $this.aixadacart("getRowData", {
			  				type : 'xml',
			  				row : $(this)			  				
			  			});
			  			
			  			$this.aixadacart("addItem",objItem);
			  		 
			  		});// end each row	
    			 
    			 	$this.data('aixadacart').loadSuccess.call(this);
    			 	$this.data('aixadacart').unsavedItems = false;
    			 	
    			 	
     		 	},//end success ajax
     		 	error : function(XMLHttpRequest, textStatus, errorThrown){
     		 		updateCartTips.call('error',XMLHttpRequest.responseText);
					
     		 	},
     		 	complete : function(){
     	    		 $this.data('aixadacart').isLoading = false;
     	    		 $('#cart .cartLoadAnim').hide();
     		 	}
    		 }); //end ajax
    	 });//end each
	  },  //end loadCart   
      
	  
	  /**
	   * remove event listeners and free memory
	   */
	  destroy : function( ) {
	       return this.each(function(){
	           data = $(this).data('aixadacart');
	    	   $(window).unbind('.aixadacart');
	    	   data.aixadacart.remove();
	    	   $(this).removeData('aixadacart');
	       })
	  },	  
	  
	  /**
	   * removes one item from the cart and triggers the recalc of the total price
	   */
	  removeItem : function(id) { 
		  return this.each(function(){
			  $('tr[id='+id+']', this).find('input').val(0).trigger('change').end().remove();
			 
		  });
	  }, //end removeItem
	  
	  /**
	   * resets the cart: removes all items, and sets the date to 0
	   */
	  resetCart : function(){
		  return this.each(function(){
			  $(this).aixadacart('setDate',0); 
		  });
		  
	  },
	  
	  /**
	   * removes all items from the cart. similar to resetCart but does not delete date
	   */
	  removeAll : function(){
		  return this.each(function(){
			  $("#aixada_cart_list tbody tr").empty().remove();
			  calculateTotal.call();
			 $('#btn_submit').button( "option", "disabled", true );
		  });
		  
	  },//end remove all
	  
	  /**
	   * returns if a cart has unsaved items. 
	   */
	  hasUnsavedItems : function(){
			  return $(this).data('aixadacart').unsavedItems;
	  },
	 
	  saveCart : function(){
		  //NOTE: cartLayer has to be changed, this is tempfix because $(this) is not returning the correct reference. 
		  //something wrong with plugin architecture?!?!?!?!?!?!?!?!?
		 if ($('#cartLayer').data('aixadacart').saveOnDelete){ 
			 $('#cart').submit();  
		 }
	  },
	  
	  countItems : function(){
		  var nrOfItems = 0; 
		  $("#aixada_cart_list tbody tr").each(function(){
				nrOfItems++;
			});
		  return nrOfItems;
	  },
	  
	  /**
	   * retrieves the data fields / values from a given table or xml row 
	   * breaks the chain?!!!!
	   */
	  getRowData : function(options){
		  
		  var objItem; 
		  
		  if (options.type == "xml"){
			  var row = options.row;
			  objItem = {
					id 					: $(row).find('id').text(),
					isPreorder			: $(row).find('preorder').text(),
					provider_name 		: $(row).find('provider_name').text(),
					name 				: $(row).find('name').text(),
					quantity 			: $(row).find('quantity').text(),
					//unit 				: $(row).find('unit_measure_id_order').text(),
					unit 				: $(row).find('unit').text(),
					price 				: parseFloat($(row).find('unit_price').text()),
					rev_tax_percent		: parseFloat($(row).find('rev_tax_percent').text())
				};
			 
		  } else if (options.type == "table"){
			  var row = options.row;
			  var id =  $(row).attr("id"); 
			  objItem =  {
					id 				: id,
					isPreorder		: $('#preorder_'+id).val(),
					name 			: $("td.item_name", row).text(),
					provider_name 	: $("td.item_provider_name", row).text(),
					quantity 		: formatNumInput($("#cart_quantity_"+id).val()),
					unit 			: $("td.item_unit", row).text(),
					price 			: parseFloat($("#cart_price_"+id, row).val()),
					rev_tax_percent	: parseFloat($("#cart_rev_tax_percent_"+id, row).val()),
				};
			  //alert(objItem.id + " qu: " + objItem.quantity + " price: " + objItem.price + " tax: " + objItem.rev_tax_percent);
			  
		  }
		  return objItem;

	  } //end getRowData

  	};//end public plugin methods

  	
  	/**
  	 *  utility function; replaces "," with "." and makes sure no letters are in the quantity input
  	 */
  	function formatNumInput(value){
  			
  		var fmtInput = null;
  		//alert(" ... " + $(this).data('aixadacart').decimalsQu );
		fmtInput = parseFloat(value.replace(",","."));
		if (isNaN(fmtInput)){
			//updateCartTips.call('error',$.aixadacart.msg.errInput);
			//alert($.aixadacart.msg.errInput);
			return 0.00;
		} else {
			return fmtInput; 
		}
  	}
  	
	/**
	 *	updates the information for given cart row
	 *	when quantity has changed, calculates new item total cost
	 */
	function updateRow(itemObj){
		$this = $('#aixada_cart_list'); 
		var item_total 		= itemObj.price * itemObj.quantity; 
		//set/update quantity (set the value if quantity has been changed in product list for example
		$("#cart_quantity_"+itemObj.id).val(itemObj.quantity);
			
		//set/update the total cost for item
		$("#item_total_"+itemObj.id).text(String(item_total.toFixed(2)));
		
		if (itemObj.isPreorder) return;
	}
	
	
	/** 
	 *  recalculates the total cost of all items in the cart 
	 */
	function calculateTotal(){
		 
			var total = 0; 
			var total_net = 0;
			var rev_tax_total = 0; 
			var iva_tax_total = 0; 
			
			$("#aixada_cart_list tbody tr").each(function(){
				
				var id = $(this).attr("id");
				var quantity 	= parseFloat($("#cart_quantity_"+id, $(this)).val());
				var price    	= parseFloat($("#cart_price_"+id, $(this)).val());
				var rev_tax 	= parseFloat($("#cart_rev_tax_percent_"+id, $(this)).val());
				var iva_tax 	= parseFloat($("#cart_iva_percent_"+id, $(this)).val());
				
				var item_total 	= price * quantity; 
				
  			        var item_net = item_total / (1 + rev_tax/100) / (1 + iva_tax/100);
				
				//iva and revtax is contained in the unit_price
				iva_tax_total += item_net * (iva_tax/100);
				rev_tax_total += item_net * (rev_tax/100);
	
				total_net += item_net;
				
				total += item_total;
			});


			$('#aixada_cart_list td.total_net').text(String(total_net.toFixed(2)));
			$('#aixada_cart_list td.iva_tax_total').text(String(iva_tax_total.toFixed(2)));
			$('#aixada_cart_list td.rev_tax_total').text(String(rev_tax_total.toFixed(2)));
			$('#aixada_cart_list td.total').text(String(total.toFixed(2)));
	}
  	
	
	function updateCartTips (type, msg, timing ) {
		
		var style = 'ui-state-highlight';
		var milsecs = (timing >= 0)? timing:8000;
			
		if (type == 'success'){
			style = 'cart_success_msg';
		} else if (type == 'error'){
			style = 'ui-state-error';
		} else if (type == 'notice'){
			style = 'ui-state-highlight';
		}

		
		$('#cartMsg').html(msg).addClass(style);
		setTimeout(function() {
			$('#cartMsg')
				.html('')
				.removeClass(style);
		}, milsecs );
	}
	
	function hideCartTips(){
		$('#cartMsg')
			.html('')
			.removeClass('cart_success_msg, ui-state-error, ui-state-highlight');
	}
	
	function constructDialog(){
		
		//create the dialog for the messages
			$(this).append('<div id="cart_dialog"></div>');
			$( "#cart_dialog" ).dialog({
				autoOpen: false,
				buttons: {
					Ok: function() {
						$( this ).dialog( "close" );
					}
				}
			});
		
	}
	
	
	function constructCart(which){
		
		var str = '';
		
		var tbl_head = '<thead>';
		tbl_head += '<tr>';
		tbl_head += '	<th></th>';
		tbl_head += '	<th>'+$.aixadacart.tblCol.productName+'</th>';
		tbl_head += '	<th>'+$.aixadacart.tblCol.providerName+'</th>';
		tbl_head += '	<th>'+$.aixadacart.tblCol.quantityAbbrev+'</th>';
		tbl_head += '	<th>'+$.aixadacart.tblCol.unit+'</th>';
		tbl_head += '	<th>'+$.aixadacart.total+'</th>';
		tbl_head += '</tr>';
		tbl_head += '</thead>';
		
		var tbl_foot = 	'<tfoot>';
		tbl_foot += '		<tr><td colspan="4">&nbsp;</td><td class="total_net_label">'+$.aixadacart.total+'</td><td class="total_net cart_dblBorderTop">0.00</td></tr>';
		tbl_foot += '		<tr><td colspan="4">&nbsp;</td><td class="rev_tax_label">+'+$.aixadacart.revTaxAbbrev+'</td><td class="rev_tax_total">0.00</td></tr>';
		tbl_foot += '		<tr><td colspan="4">&nbsp;</td><td class="total_label">'+$.aixadacart.total+'</td><td class="total">0.00</td></tr>';
		tbl_foot += '		<tr><td colspan="3"><p id="cartMsg"></p></td><td colspan="3"><button type="submit" id="btn_submit">'+$.aixadacart.submit+'</button></td></tr>';
		tbl_foot += '	</tfoot>';
		
		if(which == 'simple'){
			str += '<form id="cart">';
			str += '<input type="hidden" name="date" id="cart_date" value="0" />';
			str += '<table id="aixada_cart_list" class="cart_product_list">';
			str += tbl_head;
			str += '<tbody></tbody>';
			str += tbl_foot;
			str += '</table>';
			//str += '<p id="cartMsg"></p>';
			str += '</form><br/><br/><br/>';
			
			
			
		//standalone widget with main and preorder tabs
		} 		
		
		$(this).append(str);	
	}
  	
  	
  	/**
  	 * init routine for the plugin. 
  	 */
	$.fn.aixadacart = function( method ) {
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    	} else if ( typeof method === 'object' || ! method ) {
    		return methods.init.apply( this, arguments );
    	} else {
    		$.error( 'Method ' +  method + ' does not exist on jQuery.aixadacart' );
    	}
		

  };

})( jQuery );
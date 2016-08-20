function sbQuickOrderGetAttributeId(str) {
	//var start = 0;
	var start = str.indexOf('_');
	var end = str.lenght;
	var id = str.substring(start + 1, end);
	id = id.replace(/[a-z]*/, '');
	return id;
}
function sbQuickOrderGetFieldName(product, fieldName) {
	return 'product['+product.configurable_container_id+']['+product.entity_id+']['+fieldName+']';
}
var optionsPrice = null;
Product.QuickOrderConfig = Class.create(Product.Config, {
	initialize: function(config){
        this.config     = config;
        
        optionsPrice = new Product.OptionsPrice(config);
        
        this.taxConfig  = this.config.taxConfig;
        if (config.containerId) {
            this.settings   = $$('#' + config.containerId + ' ' + '.super-attribute-select');
        } else {
            this.settings   = $$('.super-attribute-select');
        }
        this.state      = new Hash();
        this.priceTemplate = new Template(this.config.template);
        this.prices     = config.prices;

        // Set default values from config
        if (config.defaultValues) {
            this.values = config.defaultValues;
        }

        // Overwrite defaults by url
        var separatorIndex = window.location.href.indexOf('#');
        if (separatorIndex != -1) {
            var paramsStr = window.location.href.substr(separatorIndex+1);
            var urlValues = paramsStr.toQueryParams();
            if (!this.values) {
                this.values = {};
            }
            for (var i in urlValues) {
                this.values[i] = urlValues[i];
            }
        }

        // Overwrite defaults by inputs values if needed
        if (config.inputsInitialized) {
            this.values = {};
            this.settings.each(function(element) {
                if (element.value) {
                	var attributeId = sbQuickOrderGetAttributeId(element.id);
                    this.values[attributeId] = element.value;
                }
            }.bind(this));
        }

        // Put events to check select reloads
        this.settings.each(function(element){
            Event.observe(element, 'change', this.configure.bind(this))
        }.bind(this));

        // fill state
        this.settings.each(function(element){
        	var attributeId = sbQuickOrderGetAttributeId(element.id);
            if(attributeId && this.config.attributes[attributeId]) {
                element.config = this.config.attributes[attributeId];
                element.attributeId = attributeId;
                this.state[attributeId] = false;
            }
        }.bind(this))
        
        // Init settings dropdown
        var childSettings = [];
        for(var i=this.settings.length-1;i>=0;i--){
            var prevSetting = this.settings[i-1] ? this.settings[i-1] : false;
            var nextSetting = this.settings[i+1] ? this.settings[i+1] : false;
            if (i == 0){
                this.fillSelect(this.settings[i])
            } else {
                this.settings[i].disabled = true;
            }
            $(this.settings[i]).childSettings = childSettings.clone();
            $(this.settings[i]).prevSetting   = prevSetting;
            $(this.settings[i]).nextSetting   = nextSetting;
            childSettings.push(this.settings[i]);
        }

        // Set values to inputs
        this.configureForValues();
        document.observe("dom:loaded", this.configureForValues.bind(this));
    },
	fillSelect: function(element){
        var attributeId = sbQuickOrderGetAttributeId(element.id);
        var options = this.getAttributeOptions(attributeId);
        this.clearSelect(element);
        element.options[0] = new Option('', '');
        element.options[0].innerHTML = this.config.chooseText;

        var prevConfig = false;
        if(element.prevSetting){
            prevConfig = element.prevSetting.options[element.prevSetting.selectedIndex];
        }

        if(options) {
            var index = 1;
            for(var i=0;i<options.length;i++){
                var allowedProducts = [];
                if(prevConfig) {
                    for(var j=0;j<options[i].products.length;j++){
                        if(prevConfig.config.allowedProducts
                            && prevConfig.config.allowedProducts.indexOf(options[i].products[j])>-1){
                            allowedProducts.push(options[i].products[j]);
                        }
                    }
                } else {
                    allowedProducts = options[i].products.clone();
                }

                if(allowedProducts.size()>0){
                    options[i].allowedProducts = allowedProducts;
                    element.options[index] = new Option(this.getOptionLabel(options[i], options[i].price), options[i].id);
                    if (typeof options[i].price != 'undefined') {
                        element.options[index].setAttribute('price', options[i].price);
                    }
                    element.options[index].config = options[i];
                    index++;
                }
            }
        }
    }
});

SbQuickorder = {
	rowTotal: 14,
	submitForm: function(form){
		SbQuickorder.setLoadWaiting();
		var form = $(form);
		new Ajax.Request(form.readAttribute('action'), {
			   method: 'post',
			   evalJSON: 'force',
			   parameters: Form.serialize(form),
			    onSuccess: function(transport){
			    json = transport.responseText.evalJSON();
			    if(json.status == 'ERROR') {
			    	alert(json.message);
			    	$('sb-checkout-processing-modal').remove();
			    }
			    else {
			    	window.location = json.redirecturl;
			    }
			}
		});
	},
	addRow: function(arg){
		this.rowTotal = this.rowTotal+1;
		var trEle = new Element('tr',{id: 'row_'+this.rowTotal});
		//sku
		var tdSkuEle = new Element('td', {class:'itemsku_'+this.rowTotal});
		var ulSkuEle = new Element('ul', {class: 'as-selections', id: 'as-selections-'+this.rowTotal});
		var liSkuEle = new Element('li', {class: 'as-original', id: 'as-original-'+this.rowTotal});
		var inputSkuEle = new Element('input', {id: 'as-input-'+this.rowTotal, class: 'input-text sku as-input', type: 'text', autocomplete: 'off', name: 'product['+this.rowTotal+'][sku]'});
		liSkuEle.update(inputSkuEle);
		ulSkuEle.update(liSkuEle);
		tdSkuEle.update(ulSkuEle);
		trEle.appendChild(tdSkuEle);
		//qty
		var tdQtyEle = new Element('td', {class:'itemqty_'+this.rowTotal});
		var inputQtyEle = new Element('input', {id: 'qty'+this.rowTotal, class: 'input-text qty', type: 'text', name: 'product['+this.rowTotal+'][qty]'});
		tdQtyEle.update(inputQtyEle);
		trEle.appendChild(tdQtyEle);
		//empty td
		var tdEmptyEle = new Element('td', {class:'itemdata_0'});
		//remove button
		var tdRemove = new Element('td', {class: 'a-right'}).update('<a href="javascript:;" id="remove_'+this.rowTotal+'" class="remove" onclick="SbQuickorder.removeRow(this)" >x Remove</a>');
		trEle.appendChild(tdEmptyEle);
		trEle.appendChild(tdRemove);
		$$('#quickorderFrm tbody').first().appendChild(trEle);
		quickorderAutocomplete.init();
	},
	removeRow: function(arg) {
		$(arg).up(1).remove();
	} ,
	setLoadWaiting: function() {
		var loading = '<div style="background-color: #999;height: 100%;left: 0;opacity: 0.8;filter: alpha(opacity = 80);position: fixed;top: 0;width: 100%;z-index: 9999;"><p style="background: none repeat scroll 0 0 #fff4e9;border: 2px solid #f1af73;color: #d85909;font-weight: bold;left: 50%;margin-left: -105px;padding: 15px 30px;position: fixed;text-align: center;top: 45%;width: 150px;z-index: 1000;"><img src="/skin/adminhtml/default/default/images/ajax-loader-tr.gif"></p></div>';
        if(document.getElementById('sb-checkout-processing-modal')) {
        	$('sb-checkout-processing-modal').remove();
        }
        //append to body
        if(!document.getElementById('sb-checkout-processing-modal')) {
        	var overlay = new Element('div', {id:'sb-checkout-processing-modal'});
        	overlay.update(loading);
        	document.body.appendChild(overlay);
    	}
    }
};
var sbQuickorderAutocomplete = Class.create();
sbQuickorderAutocomplete.prototype = {
	ajaxUrl: null,
	suggestHtml: null,
	loadproductUrl: null,
	initialize : function(searchAjaxUrl, loadProductUrl) {
		this.ajaxUrl = searchAjaxUrl;
		this.loadproductUrl = loadProductUrl;
		this.init();
		document.observe("click", function() {
			$('quickorderFrm').select('div.quickorder-autocomplete-popup').each(function(popup){
				$(popup).remove();
			});
		});
	},
	init: function() {
		$('quickorderFrm').select('input.as-input').each(function(inputElement){
			Event.observe(inputElement, 'keyup', this.onKeyUp.bind(this, inputElement));
			Event.observe(inputElement, 'focus', this.onKeyUp.bind(this, inputElement));
		}.bind(this));
	},
	onKeyUp: function(input) {
		var value = $(input).value;
		this.show(input);
	},
	show: function(input) {
		var text = $(input).value;
		this.ajaxRequest(input);
	},
	ajaxRequest: function(input) {
		var text = $(input).value;
		var me = this;
		new Ajax.Request(this.ajaxUrl, {
			   method: 'get',
			   evalJSON: 'force',
			   parameters: {q:text},
			   onSuccess: function(transport) {
			    	me.suggest(input, transport.responseText);
			   }
		});
	},
	suggest: function(input, suggestHtml) {
		var wrapper = $(input).up();
		//remove old popup if any
		$(wrapper).select('div.quickorder-autocomplete-popup').each(function(popup){
			$(popup).remove();
		});
		
		var popup = new Element('div').addClassName('quickorder-autocomplete-popup');
		
		popup.update(suggestHtml);
		wrapper.appendChild(popup);
	},
	loadProduct: function(element, params) {
		var me = this;
		var tr = $(element).up(4);
		
		var rowIndexId = $(tr).readAttribute('id');
		Object.extend(params, {rowid:rowIndexId});
		
		new Ajax.Request(this.loadproductUrl, {
			   method: 'get',
			   evalJSON: 'force',
			   onLoading: function() {
				   me.showAjaxLoading();
			   },
			   parameters: params,
			   onSuccess: function(transport) {
				   me.hideAjaxLoading();
				   json = transport.responseText.evalJSON();
				   me.updateProductData(tr, json);
			   }
		});
	},
	updateProductData: function(tr, product) {
		var tds = $(tr).select('td');
		var sku = $(tds[0]).select('input[type="text"]').first();
		$(sku).value = product.entity_id;
		$(sku).name = sbQuickOrderGetFieldName(product, 'id');
		
		var qty = $(tds[1]).select('input[type="text"]').first();
		$(qty).value = 1;
		$(qty).name = sbQuickOrderGetFieldName(product, 'qty');
		$(tds[2]).update(product.name+product.configurable_html);
	},
	changeFlexibleAttribute: function(select, productid) {
		var element = $(select).up();
		var attId = select.value;
		var params = {id:productid, conf_att:attId};
		this.loadProduct(element, params);
	},
	showAjaxLoading: function() {
		var loadingId = 'sb-ajax-processing-modal';
        var loadingHtml = '<div style="background-color: #555;height: 100%;left: 0;opacity: 0.8;filter: alpha(opacity = 80);position: fixed;top: 0;width: 100%;z-index: 99999;"><p style="background: none repeat scroll 0 0 #fff4e9;border: 2px solid #f1af73;color: #d85909;font-weight: bold;left: 50%;margin-left: -105px;padding: 15px 30px;position: fixed;text-align: center;top: 45%;width: 150px;z-index: 1000;"><img src="/skin/adminhtml/default/default/images/ajax-loader-tr.gif"></p></div>';
        
        //append to body
        if(!document.getElementById( loadingId )) {
        	var overlay = new Element('div', {id:loadingId});
        	overlay.update(loadingHtml);
        	document.body.appendChild(overlay);
    	} else {
    		$( loadingId ).show();
    	}
    },
    hideAjaxLoading: function() {
    	var loadingId = 'sb-ajax-processing-modal';
    	if(document.getElementById( loadingId )) {
        	$( loadingId ).remove();
        }
    }
};

var sbQuickorderUpload = Class.create();
sbQuickorderUpload.prototype = {
	urlUpload : null,
	initialize : function() {
		me = this;
		me.urlUpload = $('quickorder-upload').readAttribute('action');
		Event.observe($('quickorder-upload'), 'submit', function(event) {
			me.ajaxUpload();
			Event.stop(event);
		});
	},
	ajaxUpload : function() {
		me = this;
		var formdata = new FormData();
		var file = $("file").files[0];
		if (typeof file == 'undefined') {
			alert('Please upload a speadsheet.');
		} 
		else {
			SbQuickorder.setLoadWaiting();
			formdata.append('file', file);
			Ajax.UploadRequest = Class.create(Ajax.Request, {
				setRequestHeaders : function() {
				}
			});
			new Ajax.UploadRequest(me.urlUpload, {
				method : 'post',
				postBody : formdata,
				onSuccess : function(transport) {
					var data = transport.responseText.evalJSON();
					if(data.status == 'SUCCESS') {
						$$('#quickorderFrm > table > tbody').first().insert({
							  before: data.html,
							});
						$('sb-checkout-processing-modal').remove();
					}
				}
			});
		}
	}
}
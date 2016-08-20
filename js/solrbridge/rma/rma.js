var sbRma = Class.create();
sbRma.prototype = {
	urlOrder : null,
	initialize : function(urlOrder){
		me = this;
		this.urlOrder = urlOrder;
		$('selectbox-order').observe('change',function(){
			me.ajaxRmaOrder(me.urlOrder);
		});
	},
	ajaxRmaOrder : function(urlOrder){
		setLoadWaiting();
		var order_id = $('selectbox-order').getValue();
		new Ajax.Request(urlOrder, {
				method: 'post',
				parameters:{order_id:order_id},
				onSuccess: function(transport) {
					$('sb-checkout-processing-modal').remove();
					var data = transport.responseText.evalJSON();
		 				$('items').update(data.html);
				  	}
		});
	},
}
 
var sbRmaItems = Class.create();
sbRmaItems.prototype = {
		urlSelect : null,
		urlIndex : null,
		initialize : function(urlSelect,urlIndex) {
			you = this;
			you.urlSelect = urlSelect;
			you.urlIndex = urlIndex
			$('sbrma_saveorder_btn').observe('click',function(){
				you.ajaxRmaSave(you.urlSelect,you.urlIndex);
			});
		},
		ajaxRmaSave : function(urlSelect,urlIndex){
			var form = $('items-table');
			$$('#items-table .qty-purchase').each(function(item){
				var qtyPurchase = parseInt(item.readAttribute('root-value'));
				var qtyReturn = parseInt(item.value);
				if(qtyReturn > qtyPurchase) {
					if(!$(item).hasClassName('validate-qty')) {
						$(item).addClassName('validate-qty');
					}
				}
				else {
					if($(item).hasClassName('validate-qty')) {
						$(item).removeClassName('validate-qty');
					}
				}
			});
			var validator = new Validation(form);
			if(validator.validate()) {
				setLoadWaiting();
				new Ajax.Request(urlSelect, {
					method: 'post',
					parameters: Form.serialize(form),
					onSuccess: function(transport) {
						$('sb-checkout-processing-modal').remove();
						var data = transport.responseText.evalJSON();
						if(data['error']==true){
							alert(data['message']);
						}
						if(data['error']==false){
							alert(data['message']);
							window.location.href = urlIndex;
						}
				  	}
				}); 
			}
			else {
			    return;
			}
		}
}

function showQtyReturn(el,id) {
	if($(el).checked){
		$(el).up(1).select('.input-qty').first().show();
		$(el).up(1).select('.input-reason').first().show();
	}
	if(!$(el).checked){
		$(el).up(1).select('.input-qty').first().hide();
		$(el).up(1).select('.input-reason').first().hide();
	}
}
function setLoadWaiting() {
	var loading = '<div style="background-color: #999;height: 100%;left: 0;opacity: 0.8;filter: alpha(opacity = 80);position: fixed;top: 0;width: 100%;z-index: 9999;"><p style="background: none repeat scroll 0 0 #fff4e9;border: 2px solid #f1af73;color: #d85909;font-weight: bold;left: 50%;margin-left: -105px;padding: 15px 30px;position: fixed;text-align: center;top: 45%;width: 150px;z-index: 1000;"><img src="/skin/adminhtml/default/default/images/ajax-loader-tr.gif"></p></div>';
    if(document.getElementById('sb-checkout-processing-modal')) {
    	$('sb-checkout-processing-modal').remove();
    }
    if(!document.getElementById('sb-checkout-processing-modal')) {
    	var overlay = new Element('div', {id:'sb-checkout-processing-modal'});
    	overlay.update(loading);
    	document.body.appendChild(overlay);
	}
}
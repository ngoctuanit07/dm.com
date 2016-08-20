var QuoteInfo = Class.create();
QuoteInfo.prototype = {
		quotepopupUrl: null,
		getShippingUrl : null,
		countryId: null,
		isValid : true,
		formId: null,
		selectProduct: 0,
		showQuoteUrl : null,
	initialize : function(quotepopupUrl, showQuoteUrl) {
		me = this;
		me.quotepopupUrl = quotepopupUrl;
		me.showQuoteUrl = showQuoteUrl;
	},
	showQuote : function(button) {
		var form = $('product_addtocart_form');
		var formData = Form.serialize(form);
		new Ajax.Request(this.quotepopupUrl, {
			method: 'post',
			parameters: formData,
			  onSuccess: function(transport) {
				  var data = transport.responseText.evalJSON();
				  if(data.status = 'SUCCESS') {
					  var url = location.protocol + "//" + location.host + '/sbquote/quote' ;
						location.href = url;
				  }
			  }
			});
	},
}
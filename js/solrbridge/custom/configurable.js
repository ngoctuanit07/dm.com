/**
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade SolrBridge_Configurable to newer
 * versions in the future.
 *
 * @category    SolrBridge
 * @package     SolrBridge_Configurable
 * @author      Hau Danh
 * @copyright   Copyright (c) 2011-2014 Solr Bridge (http://www.solrbridge.com)
 */
/****************************EXTEND CONFIGURABLE PRODUCT **************************/
//Product.ExtlabConfig = Class.create(Product.Config, {});
Product.ExtlabConfig = Class.create(Product.Config, {
	initialize: function(config){
        this.config     = config;
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
                    var attributeId = element.id.replace(/[a-z]*/, '');
                    this.values[attributeId] = element.value;
                }
            }.bind(this));
        }
        var me = this;
        // Put events to check select reloads
        var elementIndex = 1;
        this.settings.each(function(element){
        	$(element).writeAttribute('data-index', elementIndex);
            Event.observe(element, 'change', this.configure.bind(this));
            elementIndex++;
            this.fillEmptyElement(element,this.config);
        }.bind(this));

        // fill state
        this.settings.each(function(element){
            var attributeId = element.id.replace(/[a-z]*/, '');
            if(attributeId && this.config.attributes[attributeId]) {
                element.config = this.config.attributes[attributeId];
                element.attributeId = attributeId;
                this.state[attributeId] = false;
            }
            if(attributeId && this.config.attributes[attributeId] && parseInt(this.config.attributes[attributeId]['allowDisplaySelect'])) {
            	$('attribute'+attributeId).show();
            }
            else {
            	$('attribute'+attributeId).hide();
            }
        }.bind(this))

        // Init settings dropdown
        var childSettings = [];
        for(var i=this.settings.length-1;i>=0;i--){
            var prevSetting = this.settings[i-1] ? this.settings[i-1] : false;
            var nextSetting = this.settings[i+1] ? this.settings[i+1] : false;
            if (i == 0){
                this.fillSelect(this.settings[i], this.config);
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

    configureElement : function(element) {
        this.reloadOptionLabels(element);
        if(element.value){
            this.state[element.config.id] = element.value;
            if(element.nextSetting){
                element.nextSetting.disabled = false;
                this.fillSelect(element.nextSetting, this.config);
                this.resetChildren(element.nextSetting);
            }
        }
        else {
            this.resetChildren(element);
        }
        this.reloadPrice();
        this.loadImages(element);
    },
    
    loadImages: function(element) {
    	var productIds = [];
    	for(var i=this.settings.length-1;i>=0;i--){
            var selected = this.settings[i].options[this.settings[i].selectedIndex];
            
            if(selected.config){
            	productIds = selected.config.products;
            }
        }
    	var indexOfSelect = element.readAttribute('data-index');
    	var indexofProduct = element.selectedIndex - 1;
    	if(indexOfSelect != 1) {
    		productIds = [productIds[indexofProduct]]; 
    	}
    	//load default
    	if(productIds.length < 1) {
    		for(key in this.config.extlabmedia) {
    			productIds.push(key);
    		}
    	}
    	// end add slider for thumb image.
    	ProductMediaManager.init();
    },

    fillSelect: function(element, config){
        var attributeId = element.id.replace(/[a-z]*/, '');
        var options = this.getAttributeOptions(attributeId);
        this.clearSelect(element);
        element.options[0] = new Option('', '');
        element.options[0].innerHTML = this.config.chooseText;

        var prevConfig = false;
        if(element.prevSetting){
            prevConfig = element.prevSetting.options[element.prevSetting.selectedIndex];
        }
        
        /**********************/
        //element.hide();
        var extAttributeId = 'extlab-'+element.id + '-wrapper';
        if( document.getElementById( extAttributeId ) ){
        	$(extAttributeId).remove();
        }
        var optionWrapper = new Element('div', {id:extAttributeId});
        //create options
        var optionUl = new Element('ul').addClassName('extlab-option-container');
        /***********************/

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
                    if (typeof options[i].image != 'undefined' && options[i].image) {
                    	element.options[index].setAttribute('data-content', '<img src="'+options[i].image+'"/>');
                    }
                    element.options[index].config = options[i];
                    
                    /***************/
                    var dataIndex = $(element).readAttribute('data-index');
                    var optionLi = new Element('li').addClassName('extlab-option-element');
                    $(optionLi).writeAttribute('data-index', dataIndex);
                    $(optionLi).writeAttribute('data-attribute-id', element.id);
                    
                    
                    
                    
                    var optionLabel = this.getOptionLabel(options[i], options[i].price);
                    optionLi.update(optionLabel);
                    	
                    optionUl.appendChild(optionLi);
                    Event.observe(optionLi, 'click', this.optionClick.bind(this, element, index, optionLi));
                    /**************/
                    
                    index++;
                }
            }
        }
        optionWrapper.appendChild(optionUl);
        if(attributeId && config.attributes[attributeId] && !parseInt(config.attributes[attributeId]['allowDisplaySelect'])) {
        	element.insert({after:optionWrapper});
        }
    },
    
    optionClick: function(select, index, li) {
    	var countAttribute = $$('.extlab-option-container').length;
    	var indexAttribute = parseInt($(li).readAttribute('data-index'));
    	$$('.extlab-option-container').each(function(item){
    		var indexItem = parseInt($(item).down().readAttribute('data-index'));
    		var dataAttributeId = $(item).down().readAttribute('data-attribute-id');
    		if(indexItem > indexAttribute) {
    			$(item).update('<li class="extlab-option-element disabled">Choose an Option...</li>');
    		}
    	});
    	$(select).selectedIndex = index;
    	$(select).simulate('change');
    	$(li).up().childElements().each(function(child){
    		$(child).removeClassName('checked');
    	});
    	$(li).addClassName('checked');
    	var currentLiDataIndex = $(li).readAttribute('data-index');
    	var refillIds = [];
    	$('product-options-wrapper').select('.extlab-option-element').each(function(childLi){
    		var liDataIndex = $(childLi).readAttribute('data-index');
    		if( liDataIndex > currentLiDataIndex ) {
    			refillIds.push($(childLi).readAttribute('data-attribute-id'));
    			if(typeof $(childLi).up() !== undefined && $(childLi).up().childElements().length < 1) {
    				$(childLi).up().remove();
    			}
    			if(typeof childLi !== undefined) {
    				$(childLi).remove();
    			}
    		}
    	});
    	
    	$(refillIds).each(function(elementId){
    		this.refillElement(elementId, this.config)
    	}.bind(this));
    },
    refillElement: function(elementId, config) {
    	
    	var element = $(elementId);
    	var attributeId = element.id.replace(/[a-z]*/, '');
    	/**********************/
        var extAttributeId = 'extlab-'+element.id + '-wrapper';
        if( document.getElementById( extAttributeId ) ){
        	$(extAttributeId).remove();
        }
        var optionWrapper = new Element('div', {id:extAttributeId});
        //create options
        var optionUl = new Element('ul').addClassName('extlab-option-container');
        /***********************/
        var index = 1;
        var options = element.options;
    	for(var i=0; i<options.length; i++) {
    		//ignore the first option
    		if( i == 0) continue;
    		
    		/***************/
            var dataIndex = $(element).readAttribute('data-index');
            var optionLi = new Element('li').addClassName('extlab-option-element');
            $(optionLi).writeAttribute('data-index', dataIndex);
            $(optionLi).writeAttribute('data-attribute-id', element.id);
            
            
            var optionLabel = this.getOptionLabel(options[i], options[i].price);
            
            optionLi.update(optionLabel);
            
            optionUl.appendChild(optionLi);
            Event.observe(optionLi, 'click', this.optionClick.bind(this, element, index, optionLi));
            /**************/
            index++;
    	}
    	
    	if(options.length < 2) {
    		this.fillEmptyElement(element, this.config);
    		return;
    	}
    	
    	optionWrapper.appendChild(optionUl);
    	if(attributeId && config.attributes[attributeId] && !parseInt(config.attributes[attributeId]['allowDisplaySelect'])) {
    		element.insert({after:optionWrapper});
        }
    },
    fillEmptyElement: function(element, config){
    	/**********************/
    	var attributeId = element.id.replace(/[a-z]*/, '');
        var extAttributeId = 'extlab-'+element.id + '-wrapper';
        if( document.getElementById( extAttributeId ) ){
        	$(extAttributeId).remove();
        }
        var optionWrapper = new Element('div', {id:extAttributeId});
        //create options
        var optionUl = new Element('ul').addClassName('extlab-option-container');
        /***********************/
    	var options = element.options;
    	var i = 0;
    	/***************/
        var dataIndex = $(element).readAttribute('data-index');
        var optionLi = new Element('li').addClassName('extlab-option-element disabled');
        $(optionLi).writeAttribute('data-index', dataIndex);
        $(optionLi).writeAttribute('data-attribute-id', element.id);
        var optionLabel = this.getOptionLabel(options[i], options[i].price);
        optionLi.update(optionLabel);
        optionUl.appendChild(optionLi);
        //Event.observe(optionLi, 'click', this.optionClick.bind(this, element, index, optionLi));
        /**************/
    	
    	optionWrapper.appendChild(optionUl);
    	if(attributeId && config.attributes[attributeId] && !parseInt(config.attributes[attributeId]['allowDisplaySelect'])) {
    		element.insert({after:optionWrapper});
        }
    }
});
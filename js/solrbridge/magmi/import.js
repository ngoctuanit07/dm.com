var SolrBridge_Magmi_Import = Class.create();
SolrBridge_Magmi_Import.prototype = {
		initialize: function(uploadUrl, formKey) {
			var me = this;
			Event.observe(window,'load',function(){
				Event.observe($("file"),'change', function() {
					var formdata = new FormData();	
					var files = $("file").files;
					
					numFiles = files.length;
					for( i=0; i< numFiles; i++) {
						(function(uploadFile){
							var filename = 'file_' + ((new Date()).getTime() + i);
							formdata.append(filename, uploadFile);
				 		})(files[i]); // end each loop
					 };
					
					//formdata.append('file', file);
					formdata.append('form_key', formKey);
					Ajax.UploadRequest = Class.create(Ajax.Request, {setRequestHeaders: function(){}});
					new Ajax.UploadRequest(uploadUrl, {
							method:'post',
							postBody: formdata,
							onSuccess: function(transport){
			                    //Parse response to Json
			                    if (transport && transport.responseText){
			                        try{
			                            response = eval('(' + transport.responseText + ')');
			                        }
			                        catch (e) {
			                            response = {};
			                        }
			                    }
			                    if(undefined !== response && response.status == 'DONE') {
			                      window.location.reload(true);
			                    } else {
			                      alert(response.message);
			                    }
						    }
					});
				});
			});
			var checkAllLink = $('checkall');
			Event.observe(checkAllLink, 'click', me.onCheckAll.bind(me, checkAllLink));
			Event.observe('delete-selected-items', 'click', me.onDeleteSelectedItems.bind(me));
		},
		onCheckAll: function(el, e) {
			$$('input[class="massaction-checkbox"]').each(function(element){
				element.checked = el.checked;
			});
		},
		onDeleteSelectedItems: function() {
			if(!confirm('Are you sure to delete selected files?')) return;
			var me = this;
			var fileNames = [];
			$$('input[class="massaction-checkbox"]').each(function(element) {
				if(element.checked) {
					var deleteUrl = $(element).readAttribute('data-delete-url');
					me.doDeleteFile(deleteUrl, false);
				}
			});
			window.location.reload(true);
		},
		deleteFile: function( deleteUrl, confirmText ) {
			if(!confirm(confirmText)) return;
			this.doDeleteFile(deleteUrl, true);
		},
		doDeleteFile: function( deleteUrl , reload = false) {
			new Ajax.Request(deleteUrl, {
					method:'get',
					onSuccess: function(transport){
	                    //Parse response to Json
	                    if (transport && transport.responseText) {
	                        try{
	                            response = eval('(' + transport.responseText + ')');
	                        }
	                        catch (e) {
	                            response = {};
	                        }
	                    }
	                    if(undefined !== response && response.status == 'DONE' && reload) {
	                      window.location.reload(true);
	                    } else {
	                      alert(response.message);
	                    }
				    }
			});
		},
		importFile: function(importUrl) {
			new Ajax.Request(importUrl, {
					method:'get',
					onSuccess: function(transport){
	                    //Parse response to Json
	                    if (transport && transport.responseText) {
	                        try{
	                            response = eval('(' + transport.responseText + ')');
	                        }
	                        catch (e) {
	                            response = {};
	                        }
	                    }
	                    if(undefined !== response && response.status == 'DONE') {
	                      window.location.reload(true);
	                    } else {
	                      alert(response.message);
	                    }
				    }
			});
		}
}
<?php
class SolrBridge_Importcategory_Helper_Data extends Mage_Core_Helper_Abstract{
	public function createFileAfterUpload($fileName, $nameInput, $path) {
		if (isset($fileName)) {
			$fname = $fileName;
			try {
				$uploader = new Varien_File_Uploader($nameInput);
				$uploader->setAllowedExtensions(array('xlsx'));
				$uploader->setAllowCreateFolders(true);
				$uploader->setAllowRenameFiles(false);
				$uploader->setFilesDispersion(false);
				return $uploader->save($path,$fname);
			} catch (Exception $e) {
				echo $e->getMessage();
			}
		}
		return false;
	}
	
	public function processFileUploaded( $fileData, $folder) {
		if ( isset($fileData) && count($fileData) > 0 ) {
			$returnData = null;
			$pathRoot = Mage::getBaseDir('media').DS.'solrbridge'. DS . $folder . DS;
			foreach ($fileData as $fileId => $file) {
				$fileName = str_replace(' ', '_', $file['name']);
				$fileName = preg_replace("/^'|[^A-Za-z0-9._\']|'$/", '', $fileName);
				$fileInfo = $this->createFileAfterUpload($fileName, $fileId, $pathRoot);
				if(isset($fileInfo['path']) && isset($fileInfo['file']))
				{
					$returnData = $fileInfo['path'] . $fileInfo['file'];
				}
			}
		}
		return $returnData;
	}
	public function validateAttributeValue($attrCode, $attrValue, &$product)
	{
		$optionId = null;
		$attr = Mage::getModel('catalog/product')->getResource()->getAttribute($attrCode);
		if( !$attr ) {
			return false;
		}
		$frontendInput = $attr->getFrontendInput();
		// if attribute type = text field, text area and attribute value not empty => return true
		if ( in_array($frontendInput, array('textarea', 'text', 'price')) && !empty($attrValue) ) {
			return true;
		}
		/* 
		if ($attr->usesSource()) {
			$optionId = $attr->getSource()->getOptionId($attrValue);
			if($optionId){
				return true;
			}
		} */
		
		switch ($frontendInput) {
			case 'boolean':
				switch (strtolower($attrValue)) {
					case 'yes':
						$product->setData($attrCode, 1);
						break;
					case 'no':
						$product->setData($attrCode, 0);
						break;
					default:
						break;
				}
				break;
			case 'date':
				$product->setData($attrCode, $attrValue);
				break;
			case 'select':
				//check if option exist return true
				$options = $this->getAttributeAllOptions($attr);
				if( $this->inArrayCaseInsensitive($attrValue, $options) ) {
					$optionId = $attr->getSource()->getOptionId($attrValue);
					$product->setData($attrCode, $optionId);
				}
				//insert new option if option not exist and return true
				try {
					$optionId = $this->addNewAttributeOption($attr, $attrValue);
					$product->setData($attrCode, $optionId);
				} catch (Exception $e) {
					throw $e;
				}
				break;
			case 'multiselect':
				$attrValues = explode('|', $attrValue);
				$options = $this->getAttributeAllOptions($attr);
				if ( !empty($attrValues) ) {
					$prepareOptions = array();
					foreach ( $attrValues as $attrValue) {
						//insert new option if option not exist and save attribute
						if( !$this->inArrayCaseInsensitive($attrValue, $options) ) {
							try {
								$optionId = $this->addNewAttributeOption($attr, $attrValue);
								$prepareOptions[] = $optionId;
							} catch (Exception $e) {
								throw $e;
							}	
						}
						//check if option exist, save attribute
						else {
							$optionId = $attr->getSource()->getOptionId($attrValue);
							$prepareOptions[] = $optionId;
						}
					}
					if(!empty($prepareOptions)) {
						try {
							$product->setData($attrCode, $prepareOptions);
							$product->save();
						} catch (Exception $e) {
							throw $e;
						}						
					}
				}
				break;
			default:
				return false;
				break;
		}
		return false;
	}
	public function getAttributeAllOptions($attr) {
		$attributeOptionsModel = Mage::getModel('eav/entity_attribute_source_table');
		$attributeOptionsModel->setAttribute($attr);
		$options = $attributeOptionsModel->getAllOptions(false);
		$returnOptions = array();
		foreach ( $options as $option ) {
			if( isset($option['value']) && isset($option['label']) && !empty($option['value']) && !empty($option['label']) ) {
				$returnOptions[$option['value']] = $option['label'];
			}
		}
		return $returnOptions;
	}
	public function inArrayCaseInsensitive($needle, $haystack) {
		return in_array( strtolower($needle), array_map('strtolower', $haystack) );
	}
	
	public function addNewAttributeOption($attribute, $option)
    {
        $value['option'] = array($option,$option);
        $optionData = array('value' => $value);
        $attribute->setData('option', $optionData);
        $attribute->save();
        $allOptions = $this->getAttributeAllOptions($attribute);
        $allOptions = array_flip($allOptions);
        return $allOptions[$option];
    }
    public function getOptionLabelById($attr, $optionId)
    {
    	$attributeOptionsModel = Mage::getModel('eav/entity_attribute_source_table');
    	$attributeOptionsModel->setAttribute($attr);
    	$options = $attributeOptionsModel->getAllOptions(false);
    	foreach ( $options as $option ) {
    		if($option['value'] == $optionId)
    		{
    			return $option['label'];
    		}
    	}
    	return null;
    }
	}
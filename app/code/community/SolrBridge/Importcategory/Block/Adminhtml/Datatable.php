<?php

class SolrBridge_Importcategory_Block_Adminhtml_Datatable extends Mage_Core_Block_Template {
	
	public $productObject = null;
	public $pageNum = null;
	public $limit = null;
	public $tableHeadData = array();
	public $pageTotal = null;
	public $rowTotal = null;
	public function __construct()
	{
		parent::__construct();
		
		$this->setCollection($this->getCollection());
		$this->pageNum = $this->getRequest()->getParam('p') ? $this->getRequest()->getParam('p') : 1;
		$this->limit = 50;
	}
	public function getTableHeadData(){
		$excelDataArr = $this->getCollection();
		return isset($excelDataArr[0]) ? $excelDataArr[0] : array();
	}
	public function getDataFromExcelFile()
	{
		$productArr = array();
		$excelDataArr = $this->getCollection();
		unset($excelDataArr[0]);
		$size = count($excelDataArr);
		$this->rowTotal = $size;
		$pages = ceil($size / $this->limit);
		$this->pageTotal = $pages;
		$offset = ($this->pageNum - 1)  * $this->limit;
		$start = $offset + 1;
		$i = 1;
		$no = $start;
		foreach($excelDataArr as $row) {
			if($start <= $i) {
				
				if ( $i <= min( ( $offset + $this->limit), $size ) ) {
					$productArr[$no] = $row;
					$no++;
				}
			}
			$i++;
		}
		return $productArr;
	}
	public function checkProductExistBySku($sku)
	{
		$product= Mage::getModel('catalog/product')->loadByAttribute('sku', $sku); //Get Product by ID (ASIN)
		if(!is_object($product) || !$product->getId()){
			return false;
		}
		return true;
	} 
	public function getValueByAttributeCode($sku, $attributeCode)
	{
		$attr = null;
		$frontendInput = null;
		$attributeValue = 'none';
		if($attributeCode != 'qty') {
			$attr = Mage::getModel('catalog/product')->getResource()->getAttribute($attributeCode);
			if( !$attr) {
				return $attributeValue;
			}
			else {
				$frontendInput = $attr->getFrontendInput();
			}
		}
		$product = Mage::getModel('catalog/product')->loadByAttribute('sku', $sku);
	
		if(is_object($product) && $product->getId()){
			// if attribute type = text field, text area, return attribute value
			if($attributeCode === 'qty') {
				$stock = Mage::getModel('cataloginventory/stock_item')->loadByProduct($product->getId());
				return $stock->getQty();
			}
			if ( in_array($frontendInput, array('textarea', 'text', 'price')) ) {
				return $product->getData($attributeCode);
			}
			switch ($frontendInput) {
				case 'boolean':
					return $product->getData($attributeCode) ? 'yes' : 'no';
				break;
				case 'date':
					if($product->getData($attributeCode)) {
						$date = new DateTime($product->getData($attributeCode));
						return  $date->format('m-d-Y');
					}
					break;
				case 'select':
					$optionId = $product->getData($attributeCode);
					return $optionLabel = Mage::helper('sbimportcategory')->getOptionLabelById($attr, $optionId);
					break;
				case 'multiselect':
					$optionLabel = null;
					$optionIdsStr = $product->getData($attributeCode);
					$optionIdsArr = explode(',', $optionIdsStr);
					foreach ($optionIdsArr as $optionId)
					{
						$optionLabel .= Mage::helper('sbimportcategory')->getOptionLabelById($attr, $optionId) . '|';
					}
					return trim($optionLabel, '|');
					break;
	
				default:
					return $product->getData($attributeCode);
					break;
			}
		}
		return $attributeValue;
	}
}
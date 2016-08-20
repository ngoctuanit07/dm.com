<?php
class SolrBridge_Importcategory_Adminhtml_ImportcategoryController extends Mage_Adminhtml_Controller_Action{
	public function indexAction(){
		$this->loadLayout();
		$this->renderLayout();
	}
	public function readAction() {
		$response = array( 'status' => 'ERROR', 'message' => $this->__('Cannot find any image Data!')) ;
		if ( isset($_FILES) && count($_FILES) > 0 ) {
			$pathFileUpload = Mage::helper('sbimportcategory')->processFileUploaded( $_FILES, 'importcategory' );
			if ($pathFileUpload) {
				Mage::getSingleton('adminhtml/session')->setData('excelFilePath', $pathFileUpload);
				$excelObject = SolrBridge_Xlsx::loadXlsxFile($pathFileUpload);
				$excelArr = SolrBridge_Xlsx::$data;
				$layout = $this->getLayout();
				$block = $layout->createBlock('sbimportcategory/adminhtml_datatable', 'sbimportcategory.children.data')->setTemplate('solrbridge/importcategory/datatable.phtml')->setCollection('data', $excelObject);
				$block->setData('collection', $excelArr);
				echo $block->toHtml();
			}
		}
		return ;
	}
	public function saveAction()
	{
		$responses = array('status' => 'SUCCESS', 'message' => 'Save success!');
		$categoryData = $this->getRequest()->getParam('category');
		
		//print_r($categoryData);die();
		
		$category = Mage::getModel('catalog/category');
		if(isset($categoryData) && !empty($categoryData)) {
		    
			foreach($categoryData as $catId => $catData) {
				$category = Mage::getModel('catalog/category')->load($catId);
				if( is_object($category) && $category->getId() ){
					//Category exists - we update
				    $category->setData('name', $catData['name']);
				    $category->setData('path', $catData['path']);
				    $category->setData('parent_id', $catData['parent_id']);
				    $category->setData('position', $catData['position']);
				} else {
				    $category = Mage::getModel('catalog/category');
				    $category->setStoreId(0);
				    //$category->setData('entity_id', $catId);
				    $category->addData($catData);
				}
				
				try {
				    $category->save();
				}
				catch (Exception $e) {
				    $responses['message'] = $e->getMessage();
				}
			}
			
		}
		echo json_encode($responses);
		return;
	}
	public function changepageAction()
	{
		$excelFilePath = Mage::getSingleton('adminhtml/session')->getData('excelFilePath');
		if ($excelFilePath) {
			$excelObject = SolrBridge_Xlsx::loadXlsxFile($excelFilePath);
			$excelArr = SolrBridge_Xlsx::$data;
			$layout = $this->getLayout();
			$block = $layout->createBlock('sbimportcategory/adminhtml_datatable', 'sbimportcategory..data')->setTemplate('solrbridge/importcategory/datatable.phtml')->setCollection('data', $excelObject);
			$block->setData('collection', $excelArr);
			echo $block->toHtml();
		}
		return ;
	}
}
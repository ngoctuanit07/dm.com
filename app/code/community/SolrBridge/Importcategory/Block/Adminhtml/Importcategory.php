<?php

class SolrBridge_Importcategory_Block_Adminhtml_Importcategory extends Mage_Core_Block_Template {
	public function getSaveDataUrl()
	{
		return  Mage::helper("adminhtml")->getUrl("sbimportcategory_admin/adminhtml_importcategory/save");
	}
	public function getReadDataUrl()
	{
		return  Mage::helper("adminhtml")->getUrl("sbimportcategory_admin/adminhtml_importcategory/read");
	}
	public function getChangePageUrl()
	{
		return	Mage::helper("adminhtml")->getUrl("sbimportcategory_admin/adminhtml_importcategory/changepage");
	}
}
<?php
/**
 * Zend Framework
 *
 * LICENSE
 *
 * This source file is subject to the new BSD license that is bundled
 * with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://framework.zend.com/license/new-bsd
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@zend.com so we can send you a copy immediately.
 *
 * @category   Zend
 * @package    Zend_Search_Lucene
 * @subpackage Document
 * @copyright  Copyright (c) 2005-2012 Zend Technologies USA Inc. (http://www.zend.com)
 * @license    http://framework.zend.com/license/new-bsd     New BSD License
 * @version    $Id: Xlsx.php 24593 2012-01-05 20:35:02Z matthew $
 */


/** Zend_Search_Lucene_Document_OpenXml */
#require_once 'Zend/Search/Lucene/Document/OpenXml.php';

/**
 * Xlsx document.
 *
 * @category   Zend
 * @package    Zend_Search_Lucene
 * @subpackage Document
 * @copyright  Copyright (c) 2005-2012 Zend Technologies USA Inc. (http://www.zend.com)
 * @license    http://framework.zend.com/license/new-bsd     New BSD License
 */
class SolrBridge_Xlsx extends Zend_Search_Lucene_Document_OpenXml
{
    /**
     * Xml Schema - SpreadsheetML
     *
     * @var string
     */
    const SCHEMA_SPREADSHEETML = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    /**
     * Xml Schema - DrawingML
     *
     * @var string
     */
    const SCHEMA_DRAWINGML = 'http://schemas.openxmlformats.org/drawingml/2006/main';

    /**
     * Xml Schema - Shared Strings
     *
     * @var string
     */
    const SCHEMA_SHAREDSTRINGS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings';

    /**
     * Xml Schema - Worksheet relation
     *
     * @var string
     */
    const SCHEMA_WORKSHEETRELATION = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet';

    /**
     * Xml Schema - Slide notes relation
     *
     * @var string
     */
    const SCHEMA_SLIDENOTESRELATION = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide';
	
    public static $data = array();
    
    /**
     * Object constructor
     *
     * @param string  $fileName
     * @param boolean $storeContent
     * @throws Zend_Search_Lucene_Exception
     */
    private function __construct($fileName, $storeContent)
    {
        if (!class_exists('ZipArchive', false)) {
            #require_once 'Zend/Search/Lucene/Exception.php';
            throw new Zend_Search_Lucene_Exception('MS Office documents processing functionality requires Zip extension to be loaded');
        }

        // Document data holders
        $sharedStrings = array();
        $worksheets = array();
        $documentBody = array();
        $coreProperties = array();

        // Open OpenXML package
        $package = new ZipArchive();
        $package->open($fileName);

        // Read relations and search for officeDocument
        $relationsXml = $package->getFromName('_rels/.rels');
        if ($relationsXml === false) {
            #require_once 'Zend/Search/Lucene/Exception.php';
            throw new Zend_Search_Lucene_Exception('Invalid archive or corrupted .xlsx file.');
        }
        $relations = simplexml_load_string($relationsXml);
        foreach ($relations->Relationship as $rel) {
            if ($rel["Type"] == Zend_Search_Lucene_Document_OpenXml::SCHEMA_OFFICEDOCUMENT) {
                // Found office document! Read relations for workbook...
                $workbookRelations = simplexml_load_string($package->getFromName( $this->absoluteZipPath(dirname($rel["Target"]) . "/_rels/" . basename($rel["Target"]) . ".rels")) );
                $workbookRelations->registerXPathNamespace("rel", Zend_Search_Lucene_Document_OpenXml::SCHEMA_RELATIONSHIP);

                // Read shared strings
                $sharedStringsPath = $workbookRelations->xpath("rel:Relationship[@Type='" . SolrBridge_Xlsx::SCHEMA_SHAREDSTRINGS . "']");
                $sharedStringsPath = (string)$sharedStringsPath[0]['Target'];
                $xmlStrings = simplexml_load_string($package->getFromName( $this->absoluteZipPath(dirname($rel["Target"]) . "/" . $sharedStringsPath)) );
                if (isset($xmlStrings) && isset($xmlStrings->si)) {
                    foreach ($xmlStrings->si as $val) {
                        if (isset($val->t)) {
                            $sharedStrings[] = (string)$val->t;
                        } elseif (isset($val->r)) {
                            $sharedStrings[] = $this->_parseRichText($val);
                        }
                    }
                }

                // Loop relations for workbook and extract worksheets...
                foreach ($workbookRelations->Relationship as $workbookRelation) {
                    if ($workbookRelation["Type"] == SolrBridge_Xlsx::SCHEMA_WORKSHEETRELATION) {
                        $worksheets[ str_replace( 'rId', '', (string)$workbookRelation["Id"]) ] = simplexml_load_string(
                            $package->getFromName( $this->absoluteZipPath(dirname($rel["Target"]) . "/" . dirname($workbookRelation["Target"]) . "/" . basename($workbookRelation["Target"])) )
                        );
                    }
                }

                break;
            }
        }

        // Sort worksheets
        ksort($worksheets);
        
		$headData = array();	
        // Extract contents from worksheets
        foreach ($worksheets as $sheetKey => $worksheet) {
            foreach ($worksheet->sheetData->row as $row) {
            	$rowData = array();
            	$i = 0;
                foreach ($row->c as $c) {
                    // Determine data type
                    $dataType = (string)$c["t"];
                    switch ($dataType) {
                        case "s":
                            // Value is a shared string
                            if ((string)$c->v != '') {
                                $value = $sharedStrings[intval($c->v)];
                            } else {
                                $value = '';
                            }

                            break;

                        case "b":
                            // Value is boolean
                            $value = (string)$c->v;
                            if ($value == '0') {
                                $value = false;
                            } else if ($value == '1') {
                                $value = true;
                            } else {
                                $value = (bool)$c->v;
                            }

                            break;

                        case "inlineStr":
                            // Value is rich text inline
                            $value = $this->_parseRichText($c->is);

                            break;

                        case "e":
                            // Value is an error message
                            if ((string)$c->v != '') {
                                $value = (string)$c->v;
                            } else {
                                $value = '';
                            }

                            break;

                        default:
                            // Value is a string
                            $value = (string)$c->v;

                            // Check for numeric values
                            if (is_numeric($value) && $dataType != 's') {
                                if ($value == (int)$value) $value = (int)$value;
                                elseif ($value == (float)$value) $value = (float)$value;
                                elseif ($value == (double)$value) $value = (double)$value;
                            }
                    }

                    $documentBody[] = $value;
                    //$value = str_replace(' ', '', $value);
                    if(empty($headData))
                    {
                    	if($this->checkAttributeExist(strtolower($value))) {
                    		$rowData[$i] = strtolower($value);
                    	}
                    }
                     elseif(!empty($headData) && ($value || is_numeric($value))) 
                    {
                    if (isset($headData[$i])) {
                    		$rowData[$headData[$i]] = $value;
                    		if('sku' !== $headData[$i]) {
                    			$attr = Mage::getModel('catalog/product')->getResource()->getAttribute($headData[$i]);
                    			if($attr) {
                    				$frontendInput = $attr->getFrontendInput();
                    				//check if attribute type is date, parse value to date
                    				if ('date' === $frontendInput) {
                    					//$time = SolrBridge_PHPExcel_Shared_Date::ExcelToPHP($value);
                    					$time = PHPExcel_Shared_Date::ExcelToPHP($value);
                    					$rowData[$headData[$i]] = Mage::getModel('core/date')->date( 'm-d-Y', $time);
                    				}
                    			}
                    		}	
                    	}
                    } 
                    /* elseif(!empty($headData) && $value)
                    {
                    	$rowData[$headData[$i]] = $value;
                    } */
                    $i++;
                }
                if(empty($headData))
                {
                	$headData = $rowData;
                }
                if(!empty($rowData)){
                	self::$data[] = $rowData;
                }
            }
        }
        // Read core properties
        $coreProperties = $this->extractMetaData($package);

        // Close file
        $package->close();

        // Store filename
        $this->addField(Zend_Search_Lucene_Field::Text('filename', $fileName, 'UTF-8'));

        // Store contents
        if ($storeContent) {
            $this->addField(Zend_Search_Lucene_Field::Text('body', implode(' ', $documentBody), 'UTF-8'));
        } else {
            $this->addField(Zend_Search_Lucene_Field::UnStored('body', implode(' ', $documentBody), 'UTF-8'));
        }

        // Store meta data properties
        foreach ($coreProperties as $key => $value)
        {
            $this->addField(Zend_Search_Lucene_Field::Text($key, $value, 'UTF-8'));
        }

        // Store title (if not present in meta data)
        if (!isset($coreProperties['title']))
        {
            $this->addField(Zend_Search_Lucene_Field::Text('title', $fileName, 'UTF-8'));
        }
    }

    /**
     * Parse rich text XML
     *
     * @param SimpleXMLElement $is
     * @return string
     */
    private function _parseRichText($is = null) {
        $value = array();

        if (isset($is->t)) {
            $value[] = (string)$is->t;
        } else {
            foreach ($is->r as $run) {
                $value[] = (string)$run->t;
            }
        }

        return implode('', $value);
    }

    /**
     * Load Xlsx document from a file
     *
     * @param string  $fileName
     * @param boolean $storeContent
     * @return SolrBridge_Xlsx
     */
    public static function loadXlsxFile($fileName, $storeContent = false)
    {
      	return new SolrBridge_Xlsx($fileName, $storeContent);
    }
    public function checkAttributeExist($attrCode)
    {
        return true;
    	$attr = Mage::getModel('catalog/product')->getResource()->getAttribute($attrCode);
    	if( !$attr ) {
    		return false;
    	}
    	return true;
    }
}

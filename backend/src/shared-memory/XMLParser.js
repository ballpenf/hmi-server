const fs = require('fs');
const xml2js = require('xml2js');

/**
 * XML 파일을 파싱하여 설정 데이터를 반환하는 클래스
 */
class XMLParser {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true
    });
  }

  /**
   * XML 파일을 파싱합니다.
   * @param {string} filePath - XML 파일 경로
   * @returns {Promise<Object>} 파싱된 설정 데이터
   */
  async parseConfigurationXML(filePath) {
    try {
      const xmlData = fs.readFileSync(filePath, 'utf-8');
      const result = await this.parser.parseStringPromise(xmlData);
      return result;
    } catch (error) {
      throw new Error(`Failed to parse XML file: ${error.message}`);
    }
  }

  /**
   * XML 파일을 동기적으로 파싱합니다.
   * @param {string} filePath - XML 파일 경로
   * @returns {Object} 파싱된 설정 데이터
   */
  parseConfigurationXMLSync(filePath) {
    try {
      const xmlData = fs.readFileSync(filePath, 'utf-8');
      let result;
      this.parser.parseString(xmlData, (err, parsed) => {
        if (err) throw err;
        result = parsed;
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to parse XML file: ${error.message}`);
    }
  }
}

module.exports = XMLParser;

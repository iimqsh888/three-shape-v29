import {useI18n} from '../i18n';
export function SponsorTokenNotice(){
 const {language}=useI18n();
 return <p className="nf-caption">{language==='en'?'Extra reward tokens are provided by the season sponsor and are unrelated to the Three Shape project team. Listing them does not constitute project endorsement or a guarantee of value.':'附加奖励代币由本赛季冠名者提供，与 Three Shape 项目方无关；展示不代表项目方背书或价值保证。'}</p>;
}

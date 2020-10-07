const { shell, header, subheader } = require('../../../views/components');
const { sidebar } = require('./components');

const list = () => shell(`
  <div class="main">
    ${header({ currentPage: 'support' })}
    ${subheader({ currentPage: 'support' })}
    <div class="views">
      ${sidebar()}
      <div class="page" id="page">
        <h1>Support kemono.party</h1>
        <p>
          This project was started as a small project out of pure boredom over one winter vacation, and has grown beyond what I could ever imagine. While I will always find ways to keep the site running one way or another, I'd like to provide bounties for developers to work on Kemono when I can't, make upgrades as Kemono's userbase grows exponentially, and fund research into paysite APIs to create more scrapers. I don't want to pressure my users to reach monthly donation goals and put terabytes of archived content in limbo, but I would also like to keep personal costs within sanity.<br>
          Even if you do not have the resources or funds to help out in the ways below, <i>thank you for using kemono.party.</i> The continued usage of the site alone gives me the drive to continue working on it.
        </p>
        <a href="https://liberapay.com/kemono.party/donate" target="_blank"><img src="https://liberapay.com/assets/widgets/donate.svg"></a>
        <h2>Affiliate codes</h2>
        <p>
          Buying products from any of the links below gives a small cut to kemono.party at no extra cost to you.
        </p>
        <a href="https://my.frantech.ca/aff.php?aff=3852" target="_blank"><img src="/buyvm.png"></a>
        <br>
        <a rel="noopener sponsored" href="https://www.dlsite.com/home/dlaf/=/aid/kemonoparty/url/https%3A%2F%2Fwww.dlsite.com%2Feng%2F%3Futm_medium%3Daffiliate%26utm_campaign%3Dbnlink%26utm_content%3Dbn_pc_468_60_eng_01.jpg" target="_blank"><img src="https://www.dlsite.com/img/abroad/eng/bn_pc_468_60_eng_01.jpg" alt="Doujin manga and game download shop - DLsite English" width="468" height="60" border="0" /></a>
        <br>
        <a href="https://www.vultr.com/?ref=8694760-6G"><img src="/vultr.webp" width="468" height="60"></a>
        <h2>Contact</h2>
        <p>
          If you have any other offers, <a href="mailto:admin@kemono.party">contact me.</a>
        </p>
      </div>
    </div>
  </div>
`);

module.exports = { list };

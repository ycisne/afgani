describe('Go to "Acerca de" page if the page is unknown', function() {
	it('should jump to /AcercaDe path when the page is unknown', function() {
		browser().navigateTo('/someDummyPage');
		expect(browser().location().path()).toBe("/AcercaDe")
	});
});
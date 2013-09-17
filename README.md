# Time Machine

Pushstate history and ajax helper for fancy websites. It handles:

- State change detection
- Replacing the URL
- Loading the new page via ajax
- Running any javascript in the new page
- Binding `<a>` tags to push state rather than navigate
- Highlighting the correct new navigation item
- Replacing the page title

Navigation highlighting and page titles are done using html `data-` attributes on the ajaxed content. You can also provide custom page data as JSON. See below for an example.

If a browser doesn't support pushState, Time Machine won't start up and the site will work normally.

## Current dependencies

- [History.js Native](https://github.com/browserstate/history.js)
- [Eventie](https://github.com/desandro/eventie)
- [Ajax.js](https://github.com/honza/ajax.js)

## Example usage

Site frame:

```html
<ul id="nav-primary">
	<li data-tm-match="rad-page"><a href="rad-page">Rad Page</a></li>
	<li data-tm-match="cool-page"><a href="cool-page">Cool Page</a></li>
	<li data-tm-match="lame-page"><a href="lame-page">Lame Page</a></li>
</ul>
<div id="ajax-receptacle"></div>
```

Ajax page template:

```html
<div id="main" data-tm-title="Cool Page - Website Name" data-tm-id="cool-page" data-tm-data='{"coolness":"very"}'>
	<h1>Cool Page</h1>
	<p>Nulla debitis earum impedit laboriosam minus? Officiis, maiores atque ea velit minima ex numquam quaerat quisquam? Delectus, hic porro voluptatem quod rem!</p>
</div>
```

Javascript:

```javascript
var time_machine = TimeMachine( {
	site_root: 'http://www.website.com',
	frameless_root: '/ajax',
	ajax_receptacle: document.querySelector( '#ajax-receptacle' ),
	state_change_selector: 'a',
	metadata_element_selector: '#main',
	nav_items: document.querySelectorAll( '#nav-primary li' ),
	nav_selected_class: 'active',
	defer_page_load: true,
	debug: true,
	beforeNewPageLoad: function( loadPage ){
		document.body.className = 'loading';
		// do something fancy, then...
		loadPage();
	},
	afterNewPageLoad: function( page_data ){
		if( page_data.coolness === "very" ){
			console.log( 'So cool.' );
		}
		document.body.className = '';
	}
} );

// Example of manual load
time_machine.pushStateChange( 'http://www.website.com/rad-page' );
```

## Inputs

- `site_root` - The site root URL (no trailing slash)
- `ajax_receptacle` - The `HTMLElement` the ajax template will be inserted into
- `metadata_element_selector` - The selector of the element with page metadata attributes (`data-tm-title`, `data-tm-id`, `data-tm-data`)
- `nav_items` - A `NodeList` of navigation elements with id match attribute (`data-tm-match`)
- `nav_selected_class` - The class to give navigation elements when they are active
- `frameless_root` - (Optional, Default `''`) The subdirectory where your ajax templates are stored (opening slash, no trailing slash)
- `state_change_selector` - (Optional, Default `'a'`) The selector(s) of `<a>`s you want to trigger state changes
- `title_while_loading` - (Optional, Default `'Loading...'`) The page title whilst a page load is in progress
- `title_suffix` - (Optional, Default `''`) A string to append to every page title (usually a site name)
- `defer_page_load` - (Optional, Default `false`) See below
- `beforeNewPageLoad` - (Optional) Function to run before a new page is loaded
- `afterNewPageLoad` - (Optional) Function to run after a new page is loaded - the first argument is the loaded page's data (`data-tm-data`)
- `debug` - (Optional, Default `false`) Generate console messages

## Methods

- `pushStateChange( url )` - Manually load a new page

## `defer_page_load`

When this option is enabled, the loading process will begin but the ajax request won't be automatic. The `beforeNewPageLoad` callback will be passed a function that triggers it. This means you can manually control when the old page disappears, giving you the opportunity to trigger any fancy page transition effects. The example above demonstrates how your callback might look.

## TODO

- Cancel the current page transition if the state changes again during loading OR ignore state changes while loading is in progress
- Test this in multiple browsers

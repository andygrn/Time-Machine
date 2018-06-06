# Time Machine

Pushstate history and ajax helper for fancy websites. It handles:

- State change detection
- Replacing the URL
- Loading new page content into any element via ajax
- Running any javascript in the new page
- Binding local `<a>` tags to push state rather than navigate
- Replacing the page title

If a browser doesn't support pushState, Time Machine won't start up and the site will work normally.

## Example usage

Site frame:

```html
<ul id="nav-primary">
	<li><a href="rad-page">Rad Page</a></li>
	<li><a href="cool-page">Cool Page</a></li>
	<li><a href="lame-page">Lame Page</a></li>
</ul>
<div id="main">
	<!-- Page content here -->
</div>
```

Ajax page template:

```html
<div data-tm-title="Cool Page" data-tm-data='{"coolness":"very"}'>
	<h1>Cool Page</h1>
	<p>Nulla debitis earum impedit laboriosam minus? Officiis, maiores atque ea velit minima ex numquam quaerat quisquam? Delectus, hic porro voluptatem quod rem!</p>
</div>
```

Javascript:

```javascript
var time_machine = new TimeMachine( {
	default_ajax_receptacle_id: 'main',
	debug: true,
	beforeNewPageLoad: function( updated_receptacle_id, loadPage ){
		document.body.className = 'loading';
		// do something fancy, then...
		loadPage( [
			['X-Custom-Header-1', 'Content'],
			['X-Custom-Header-2', 'Content']
		] );
	},
	afterNewPageLoad: function( updated_receptacle_id, page_data ){
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

- `default_ajax_receptacle_id` - The default `HTMLElement` the ajax template will be inserted into, unless the link specifies otherwise.
- `beforeNewPageLoad` - (Optional) Function to run before a new page is loaded - its first argument is the receptacle ID that will be loaded into, its second argument is a function that must be called to perform the load.
- `afterNewPageLoad` - (Optional) Function to run after a new page is loaded - its first argument is the receptacle ID that was loaded into, its second argument is the loaded page's data (`data-tm-data`).
- `debug` - (Optional, Default `false`) Generate console messages.

## Methods

- `pushStateChange( url, receptacle_id )` - Manually load a new page

## `beforeNewPageLoad`

When a state change is detected, the loading process begins but the ajax request won't be automatic; the `beforeNewPageLoad` callback will be passed a function that triggers it. This means you can manually control when the old page disappears, giving you the opportunity to trigger any fancy page transition effects.

The callback accepts an array of HTTP headers to send with the ajax request, which you can use to customise output on the server side. The example above demonstrates how your callback might look. If you're using server caching, make sure you set your `Vary "X-Requested-With,X-Custom-Header-1..."` header.

## Title and data properties

The loaded ajax receptacle's first child element is the source of page title and data. Give it a `data-tm-title` attribute and the page title will be automatically updated. You can also provide custom page data as JSON, with a `data-tm-data` attribute. The parsed JSON will be passed into your afterNewPageLoad callback.

## Alternative receptacles

By default, Time Machine will load the new page into the element specified by `default_ajax_receptacle_id`. If you want a different element's content to be updated, place a `data-tm-receptacle` attribute on the corresponding link tags, containing the ID of the element. Time Machine will load the new page, pluck that element's content from the response, and place it accordingly.

Note that if you want the page title to change on alternative receptacle requests, the receptacles' first children will need their own `data-tm-title` attributes. JSON data with `data-tm-data` is also supported.

If the specified receptacle cannot be found in the current page, Time Machine falls back to using the default receptacle.

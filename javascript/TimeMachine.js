/*
	Time Machine - Pushstate history and ajax helper
	@andygrn 2013
	Requires:
		- History.js Native (https://github.com/browserstate/history.js)
		- Eventie (https://github.com/desandro/eventie)
		- Ajax.js (https://github.com/honza/ajax.js)
*/

( function(){

	'use strict';

	window.TimeMachine = function( inputs ){

		var debug = inputs.debug ? true : false;

		if( typeof window.History === 'undefined' || typeof window.eventie === 'undefined' || typeof window.ajax === 'undefined' ){
			debugLog( 'One or more dependencies are missing', 'warn' );
			return;
		}

		if( !window.History.enabled ){
			debugLog( 'History.js is disabled', 'warn' );
			return;
		}

		if( inputs.defer_page_load && !inputs.beforeNewPageLoad ){
			debugLog( 'Missing beforeNewPageLoad callback means page will never load - add callback or disable defer_page_load', 'warn' );
			return;
		}

		var site_root = stripTrailingSlash( inputs.site_root );
		var frameless_root = inputs.frameless_root ? stripTrailingSlash( inputs.frameless_root ) : '';
		var state_change_selector = inputs.state_change_selector || 'a';
		var title_element = document.querySelector( 'title' );
		var title_while_loading = inputs.title_while_loading || 'Loading...';
		var title_suffix = inputs.title_suffix || '';
		var regex_toggle_class = new RegExp( '(?:^|\\s)' + inputs.nav_selected_class.toString() + '(?!\\S)', 'gi' );

		window.History.Adapter.bind( window, 'statechange', handleStateChange );
		bindTriggers( document.body );
		debugLog( 'Time Machine ready on "' + site_root + '"' );
		debugLog( '------' );

		function debugLog( message, type ){
			if( debug && console ){
				var message_formatted = '%cTime Machine: %c' + message;
				if( console[type || 'log'] ){
					console[type || 'log']( message_formatted, 'font-weight:bold;', '' );
				}
			}
		}

		function pushStateChange( url ){
			var stripped_href = stripTrailingSlash( url );
			if( stripped_href === stripTrailingSlash( window.location.href ) ){
				debugLog( 'State change matches current state, ignoring' );
				debugLog( '------' );
			}
			else{
				debugLog( 'Pushing new state "' + url + '"' );
				window.History.pushState( {}, title_while_loading, stripped_href );
			}
		}

		function handleStateChange(){
			debugLog( 'State change detected' );
			var pathname = getPathName( window.location.href );
			if( inputs.defer_page_load ){
				debugLog( 'Deferring page load' );
				debugLog( 'Running "beforeNewPageLoad" callback' );
				inputs.beforeNewPageLoad( function(){
					loadPage( pathname );
				} );
			}
			else{
				if( inputs.beforeNewPageLoad ){
					debugLog( 'Running "beforeNewPageLoad" callback' );
					inputs.beforeNewPageLoad();
				}
				loadPage( pathname );
			}
		}

		function loadPage( pathname ){
			debugLog( 'Requesting new page "' + pathname + '"' );
			ajax( {
				type: 'get',
				url: site_root + frameless_root + pathname,
				timeout: 5000,
				onSuccess: onLoadSuccess,
				onError: onLoadFail
			} );
		}

		function onLoadSuccess( data ){
			debugLog( 'Page successfully loaded' );
			inputs.ajax_receptacle.innerHTML = data;
			var metadata_element = inputs.ajax_receptacle.querySelector( inputs.metadata_element_selector );
			var title = metadata_element.getAttribute( 'data-tm-title' );
			var page_id = metadata_element.getAttribute( 'data-tm-id' );
			runPageScripts( inputs.ajax_receptacle );
			setTitle( title );
			highlightNav( page_id );
			bindTriggers( inputs.ajax_receptacle );
			if( inputs.afterNewPageLoad ){
				debugLog( 'Running "afterNewPageLoad" callback' );
				inputs.afterNewPageLoad();
			}
			debugLog( 'Done' );
			debugLog( '------' );
		}

		function onLoadFail(){
			debugLog( 'Page failed to load, turning back time...', 'warn' );
			window.History.back();
			debugLog( '------' );
		}

		function runPageScripts( container ){
			debugLog( 'Running page scripts' );
			var page_scripts = container.querySelectorAll( 'script' );
			for( var i = 0; i < page_scripts.length; i += 1 ){
				( new Function( page_scripts[i].innerHTML ) ).call( window );
			}
		}

		function setTitle( title ){
			var title = ( typeof title === 'undefined' ? '' : title ) + title_suffix;
			debugLog( 'Setting page title to "' + title + '"' );
			title_element.innerHTML = title;
		}

		function highlightNav( page_id ){
			debugLog( 'Highlighting navigation item "' + page_id + '"' );
			for( var i = inputs.nav_items.length; i > 0; i -= 1 ){
				var nav_item = inputs.nav_items[i-1];
				var match_id = nav_item.getAttribute( 'data-tm-match' );
				if( match_id === page_id ){
					nav_item.className += ' ' + inputs.nav_selected_class;
				}
				else{
					nav_item.className = nav_item.className.replace( regex_toggle_class, '' );
				}
			}
		}

		function bindTriggers( context ){
			var triggers = context.querySelectorAll( state_change_selector );
			debugLog( 'Binding ' + triggers.length + ' state change triggers inside "' + context.localName + ( context.id ? '#' + context.id : '' ) + '"' );
			var pushStateChangeEvent = function( event ){
				event.preventDefault();
				pushStateChange( this.href );
			};
			for( var i = triggers.length; i > 0; i -= 1 ){
				var trigger = triggers[i-1];
				eventie.bind( trigger, 'click', pushStateChangeEvent );
			}
		}

		function getPathName( url ){
			url = url.replace( site_root, '' );
			url = stripTrailingSlash( url );
			return url === '' ? '/' : url;
		}

		function stripTrailingSlash( url ){
			url = url.split( '#' )[0];
			if( url.charAt( url.length - 1 ) === '/' ){
				url = url.substr( 0, url.length - 1 );
			}
			return url;
		}

		return {
			pushStateChange: pushStateChange
		};

	};

} )();
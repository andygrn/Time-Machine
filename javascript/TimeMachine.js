/*
	Time Machine - Pushstate history and ajax helper
	@andygrn 2013
*/

( function(){

	'use strict';

	window.TimeMachine = function( inputs ){

		var debug = inputs.debug ? true : false;

		if( !( window.history && window.history.pushState ) ){
			debugLog( 'History API is unsupported - Time Machine disabled' );
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
		var title_suffix = inputs.title_suffix || '';
		var regex_toggle_class = new RegExp( '(?:^|\\s)' + inputs.nav_selected_class.toString() + '(?!\\S)', 'gi' );
		var state_change_in_progress = false;
		var unsolicited_popstate = true; // Used to fix Chrome's impatient popstate

		window.addEventListener( 'popstate', handleStateChange, false );
		bindTriggers( document.body );
		debugLog( 'Ready on "' + site_root + '"' );
		debugLog( '------' );

		function debugLog( message, type ){
			if( debug && console ){
				var message = 'Time Machine: ' + message;
				if( console[type || 'log'] ){
					console[type || 'log']( message );
				}
			}
		}

		function pushStateChange( url ){
			var stripped_href = stripTrailingSlash( url );
			if( stripped_href === stripTrailingSlash( window.location.href ) ){
				debugLog( 'State change matches current state, ignoring' );
				debugLog( '------' );
			}
			else if( state_change_in_progress ){
				debugLog( 'State change already in progress, ignoring' );
				debugLog( '------' );
			}
			else{
				debugLog( 'Pushing new state "' + url + '"' );
				window.history.pushState( {}, null, stripped_href );
				handleStateChange();
			}
		}

		function handleStateChange(){
			if( unsolicited_popstate ){
				return;
			}
			debugLog( 'State change detected' );
			state_change_in_progress = true;
			var pathname = getPathName( window.location.href );
			if( inputs.defer_page_load ){
				debugLog( 'Deferring page load' );
				debugLog( 'Running "beforeNewPageLoad" callback' );
				inputs.beforeNewPageLoad( function( custom_headers ){
					loadPage( pathname, custom_headers );
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

		function loadPage( pathname, custom_headers ){
			debugLog( 'Requesting new page "' + pathname + '"' );
			doAjaxRequest( site_root + frameless_root + pathname, custom_headers );
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
				try{
					var page_data = JSON.parse( metadata_element.getAttribute( 'data-tm-data' ) );
				}
				catch( e ){
					debugLog( 'Malformed JSON in page data attribute, ignoring', 'warn' );
				}
				inputs.afterNewPageLoad( page_data );
			}
			state_change_in_progress = false;
			debugLog( 'Done' );
			debugLog( '------' );
		}

		function onLoadFail(){
			debugLog( 'Page failed to load, turning back time...', 'warn' );
			window.history.back();
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
				unsolicited_popstate = false;
				pushStateChange( this.href );
			};
			for( var i = triggers.length; i > 0; i -= 1 ){
				var trigger = triggers[i-1];
				trigger.addEventListener( 'click', pushStateChangeEvent, false );
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

		function doAjaxRequest( url, headers ){
			if( !url ){
				return;
			}
			headers = headers || [];
			var xmlhr = new XMLHttpRequest();
			var request_completed = false;
			xmlhr.open( 'GET', url, true );
			xmlhr.setRequestHeader( 'X-Requested-With', 'XMLHttpRequest' );
			for( var i = 0; i < headers.length; i += 1 ){
				xmlhr.setRequestHeader( headers[i][0], headers[i][1] );
			}
			xmlhr.addEventListener( 'readystatechange', function(){
				if( xmlhr.readyState === 4 && !request_completed ){
					if( ( xmlhr.status >= 200 && xmlhr.status < 300 ) || xmlhr.status === 304 ){
						onLoadSuccess( xmlhr.response );
					}
					else{
						onLoadFail();
					}
					request_completed = true;
				}
			}, false );
			setTimeout( function(){
				if( request_completed ){
					return;
				}
				request_completed = true;
				onLoadFail();
			}, 8000 );
			xmlhr.send( null );
		};

		return {
			pushStateChange: pushStateChange
		};

	};

} )();